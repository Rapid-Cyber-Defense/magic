/*
 * Magic, Copyright(c) Thomas Hansen 2019, thomas@servergardens.com, all rights reserved.
 * See the enclosed LICENSE file for details.
 */

import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-security',
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss']
})
export class SecurityComponent {

  private password: string = null;
  private passwordRepeat: string = null;

  constructor(private snackBar: MatSnackBar) { }

  save() {
    this.snackBar.open('TODO: Implement this later', 'Close', {
      duration: 2000,
    });
  }
}
