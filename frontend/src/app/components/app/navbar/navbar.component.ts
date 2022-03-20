
/*
 * Magic Cloud, copyright Aista, Ltd. See the attached LICENSE file for details.
 */

// Angular and system imports.
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { Location } from '@angular/common'; 
import { Clipboard } from '@angular/cdk/clipboard';
import { ActivatedRoute, Params, Router } from '@angular/router';

// Application specific imports.
import { MatDialog } from '@angular/material/dialog';
import { Backend } from 'src/app/models/backend.model';
import { Response } from 'src/app/models/response.model';
import { ThemeService } from 'src/app/services/theme.service';
import { NavbarService } from 'src/app/services/navbar.service';
import { BackendService } from 'src/app/services/backend.service';
import { FeedbackService } from 'src/app/services/feedback.service';
import { RegisterService } from 'src/app/services/register.service';
import { ConfigService } from '../../../services/management/config.service';
import { LoginDialogComponent } from '../login-dialog/login-dialog.component';

/**
 * Navbar component wrapping main navigation in dashboard.
 */
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent implements OnInit {

  /**
   * Needed for copyright notice.
   */
  currentYear: number = new Date().getFullYear();

  /**
   * Get the screen size
   */
  @Input() largeScreen: boolean;

  /**
   * Creates an instance of your component.
   * 
   * @param activated Needed to retrieve query parameters
   * @param router Needed to redirect user after having verified his authentication token
   * @param backendService Service to keep track of currently selected backend
   * @param dialog Dialog reference necessary to show login dialog if user tries to login
   * @param feedbackService Needed to provide feedback to user
   * @param configService Needed to check configuration status ofbackend
   * @param themeService Needed to determine which theme we're using and to allow user to change theme
   * @param clipboard Needed to copy URL of endpoint
   * @param registerService Needed to allow anonymous users to register
   * @param cdRef Needed to mark component as having changes
   * @param location Needed to be able to remove query parameters
   */
  constructor(
    private activated: ActivatedRoute,
    private router: Router,
    public backendService: BackendService,
    private dialog: MatDialog,
    private feedbackService: FeedbackService,
    public configService: ConfigService,
    public themeService: ThemeService,
    public navbarService: NavbarService,
    private clipboard: Clipboard,
    private registerService: RegisterService,
    private cdRef: ChangeDetectorRef,
    private location: Location) { }

  /**
   * Implementation of OnInit.
   */
  ngOnInit() {
    this.getParams();
    this.backendService.authenticatedChanged.subscribe(() => {
      this.cdRef.detectChanges();
    });
    this.backendService.activeBackendChanged.subscribe(() => {
      this.cdRef.detectChanges();
    });
    this.backendService.endpointsFetched.subscribe(() => {
      this.cdRef.detectChanges();
    });
    this.backendService.versionRetrieved.subscribe(() => {
      this.cdRef.detectChanges();
    });
    this.navbarService.expandedChanged.subscribe(() => {
      this.cdRef.detectChanges();
    });
  }

  /**
   * Toggles the navbar.
   */
  toggleNavbar() {
    this.navbarService.toggle();
  }

  /**
   * Returns the user's status to caller.
   */
   getActiveBackendUrl() {
    if (!this.backendService.active) {
      return 'not connected';
    }
    let url = this.backendService.active.url.replace('http://', '').replace('https://', '');
    return url;
  }

  /**
   * Closes the navbar.
   */
  closeNavbar() {
    this.navbarService.expanded = false;
  }

  /**
   * Allows user to login by showing a modal dialog.
   */
  login(allowAuthentication: boolean) {
    const dialogRef = this.dialog.open(LoginDialogComponent, {
      width: '550px',
      data: {
        allowAuthentication
      }
    });
    dialogRef.afterClosed().subscribe((res: any) => {
      if (!this.largeScreen) {
        this.closeNavbar();
      }
    });
  }

   /**
   * Logs the user out from his current backend.
   */
  logout() {
    this.backendService.logout(false);
    if (!this.largeScreen) {
      this.closeNavbar();
    }
    this.router.navigate(['/']);
  }

  /**
   * Invoked when theme is changed.
   */
   toggleTheme() {
    this.themeService.toggle();
  }

  /**
   * Invoked when user wants to copy the full URL of the endpoint.
   */
   copyUrlWithBackend(url: string) {
    const currentURL = window.location.protocol + '//' + window.location.host;
    const param = currentURL + '?backend='
    this.clipboard.copy(param + encodeURIComponent(url));
    this.feedbackService.showInfoShort('Backend URL was copied to your clipboard');
  }

  /**
   * Switching to specified backend.
   * 
   * @param backend Backend to switch to
   */
  switchBackend(backend: Backend) {
    this.backendService.activate(backend);
  }

  /**
   * Removes specified backend from local storage
   * 
   * @param backend Backend to remove
   */
  deleteBackend(backend: Backend) {

    // For weird reasons the menu gets "stuck" unless we do this in a timer.
    setTimeout(() => this.backendService.remove(backend), 1);
  }

  /*
   * Private helper methods.
   */

  /*
   * Retrieving URL parameter
   */
  private getParams() {

    this.activated.queryParams.subscribe((params: Params) => {

      /*
       * Checking if user accessed system with a link containing query params.
       */
      const backend = params['backend'];
      if (backend) {
        const cur = new Backend(backend);
        const old = this.backendService.backends.filter(x => x.url === cur.url);
        if (old.length > 0) {
          cur.username = old[0].username;
          cur.password = old[0].password;
          cur.token = old[0].token;
        }
        this.backendService.upsert(cur);
        this.backendService.activate(cur);
        this.location.replaceState('');
      }
      const token = params['token'];
      if (token && token.includes('.')) {

        /*
         * 'token' query parameter seems to be a JWT token.
         *
         * Authentication request, authenticating using specified link,
         * and redirecting user to hide URL.
         */
        const url = params['url'];
        const username = params['username'];
        const backend = new Backend(url, username, null, token);
        this.backendService.upsert(backend);
        this.backendService.activate(backend);
        this.backendService.verifyToken().subscribe({
          next: () => {
            this.feedbackService.showInfo(`You were successfully authenticated as '${username}'`);
            if (this.backendService.active.token.in_role('reset-password')) {
              this.router.navigate(['/change-password']);
            } else {
              this.router.navigate(['/']);
              this.backendService.active.createAccessRights();
            }
          },
          error: (error: any) => this.feedbackService.showError(error)});

      } else if (token) {

        /*
         * 'token' seems to be a "verify email address" type of token.
         *
         * Need to set the current backend first.
         */
        const backend = new Backend(params['url'], params['username']);
        this.backendService.upsert(backend);
        this.backendService.activate(backend);
        this.registerService.verifyEmail(params['username'], token).subscribe({
          next: (result: Response) => {
            if (result.result === 'success') {
              this.feedbackService.showInfo('You successfully confirmed your email address');
              this.router.navigate(['/']);
            }
          },
          error: (error: any) => this.feedbackService.showError(error)});
      }
    });
  }
}
