import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonErrorMessages } from 'src/app/_general/classes/common-error-messages';
import { CommonRegEx } from 'src/app/_general/classes/common-regex';
import { GeneralService } from 'src/app/_general/services/general.service';

@Component({
  selector: 'app-snippet-name-dialog',
  templateUrl: './snippet-name-dialog.component.html',
  styleUrls: ['./snippet-name-dialog.component.scss']
})
export class SnippetNameDialogComponent implements OnInit {

  public CommonRegEx = CommonRegEx;
  public CommonErrorMessages = CommonErrorMessages;

  constructor(
    private generalService: GeneralService,
    private dialogRef: MatDialogRef<SnippetNameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string) { }

  ngOnInit(): void {
  }

  public save() {
    if (!this.validateName() || this.data === '') {
      this.generalService.showFeedback('Invalid input.', 'errorMessage');
      return;
    }

    this.dialogRef.close(this.data);
  }

  private validateName() {
    return this.CommonRegEx.appNames.test(this.data);
  }

}