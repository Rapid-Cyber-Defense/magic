
/*
 * Copyright (c) 2023 Thomas Hansen - For license inquiries you can contact thomas@ainiro.io.
 */

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { LoadSnippetDialogComponent } from 'src/app/components/common/load-snippet-dialog/load-snippet-dialog.component';
import { ShortkeysComponent } from 'src/app/components/common/shortkeys/shortkeys.component';
import { GeneralService } from 'src/app/services/general.service';
import { PreviewFileDialogComponent } from '../preview-file-dialog/preview-file-dialog.component';
import { RenameFileDialogComponent, FileObjectName } from '../rename-file-dialog/rename-file-dialog.component';
import { RenameFolderDialogComponent } from '../rename-folder-dialog/rename-folder-dialog.component';
import { UnsavedChangesDialogComponent } from '../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { EvaluatorService } from '../../../../../../services/evaluator.service';
import { FileNode } from '../../models/file-node.model';
import { CodemirrorActionsService } from '../../../../../../services/codemirror-actions.service';
import { FileService } from '../../../../../../services/file.service';
import { VocabularyService } from '../../../../../../services/vocabulary.service';
import { AiService } from 'src/app/services/ai.service';
import { MagicResponse } from 'src/app/models/magic-response.model';
import { ExecuteResult } from '../execute-result/execute-result-dialog.component';

/**
 * Hyper IDE editor component, wrapping currently open files, allowing user to edit the code.
 */
@Component({
  selector: 'app-ide-editor',
  templateUrl: './ide-editor.component.html',
  styleUrls: ['./ide-editor.component.scss']
})
export class IdeEditorComponent implements OnInit, OnDestroy, OnChanges {

  private codemirrorActionSubscription!: Subscription;
  private codemirrorOptions: any = {};

  @Input() currentFileData: FileNode;
  @Input() activeFolder: string = '';
  @Input() openFiles: FileNode[];

  @Output() updateFileObject: EventEmitter<any> = new EventEmitter<any>();
  @Output() getFilesFromServer: EventEmitter<any> = new EventEmitter<any>();
  @Output() dataBindTree: EventEmitter<any> = new EventEmitter<any>();
  @Output() closeFile: EventEmitter<string> = new EventEmitter<string>();
  @Output() deleteActiveFolderFromParent: EventEmitter<any> = new EventEmitter<any>();
  @Output() deleteActiveFileFromParent: EventEmitter<any> = new EventEmitter<any>();
  @Output() renameFileFromParent: EventEmitter<{ file: { path: string }, newName: string }> = new EventEmitter<{ file: { path: string }, newName: string }>();
  @Output() renameFolderFromParent: EventEmitter<any> = new EventEmitter<any>();
  @Output() createNewFileObjectFromParent: EventEmitter<any> = new EventEmitter<any>();
  @Output() focusToFind: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private dialog: MatDialog,
    private fileService: FileService,
    private aiService: AiService,
    private generalService: GeneralService,
    private evaluatorService: EvaluatorService,
    private vocabularyService: VocabularyService,
    private codemirrorActionsService: CodemirrorActionsService) { }

  ngOnInit() {

    this.watchForActions();
  }

  ngOnChanges(changes: SimpleChanges) {

    const fileExisting: number = this.openFiles.findIndex((item: any) => item.path === this.currentFileData.path);

    if (changes['currentFileData'] && !changes['currentFileData'].firstChange) {
      if (this.currentFileData) {
        if (this.currentFileData.options !== this.codemirrorOptions[this.currentFileData.path]) {
          this.getCodeMirrorOptions();
          setTimeout(() => {
            const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
            const editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
            editor.doc.isClean();
            editor.doc.markClean();
            editor.doc.clearHistory(); // To avoid having initial loading of file becoming an "undo operation".
          }, 100);
        }
      }
    }
  }

  clearEditorHistory() {

    const fileExisting: number = this.openFiles.findIndex((item: any) => item.path === this.currentFileData.path);
    const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
    const editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
    editor.doc.markClean();
    editor.doc.clearHistory(); // To avoid having initial loading of file becoming an "undo operation".
  }

  fileType() {

    return this.currentFileData?.path.substring(this.currentFileData?.path.lastIndexOf('.') + 1);
  }

  insertFromOpenAI(snippet: string) {

    this.currentFileData.content = snippet;
  }

  setFocusToActiveEditor() {

    setTimeout(() => {
      const fileExisting: number = this.openFiles.findIndex((item: FileNode) => item.path === this.currentFileData.path);
      const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
      if (activeWrapper) {
        var editor = (<any>activeWrapper.querySelector('.CodeMirror'))?.CodeMirror;
        if (editor) {
          editor.focus();
        }
      }
    }, 1);
  }

  openShortkeys() {

    this.dialog.open(ShortkeysComponent, {
      width: '900px',
      data: {
        type: ['full', 'prompt', 'find']
      }
    });
  }

  ngAfterViewInit() {

    if (!window['_vocabulary']) {
      this.vocabularyService.vocabulary().subscribe({

        next: (result: {vocabulary: string[], slots: string[]}) => {

          window['_vocabulary'] = result.vocabulary;
          window['_slots'] = result.slots;
        },

        error: error => this.generalService.showFeedback(error?.error?.message ?? error, 'errorMessage')
      });
    }
  }

  ngOnDestroy() {

    this.codemirrorActionSubscription?.unsubscribe();
  }

  /*
   * Private helper methods.
   */

  private saveActiveFile(thenClose: boolean = false) {

    this.generalService.showLoading();
    this.fileService.saveFile(this.currentFileData.path, this.currentFileData.content).subscribe({
      next: () => {

        this.markEditorClean(false);
        this.generalService.hideLoading();
        this.generalService.showFeedback('File successfully saved', 'successMessage');
        if (thenClose) {
          this.closeActiveFile(true);
        }
      },
      error: (error: any) => {

        this.generalService.hideLoading();
        this.generalService.showFeedback(error?.error?.message ?? error, 'errorMessage');
      }
    });
  }

  private deleteActiveFile() {

    this.deleteActiveFileFromParent.emit();
  }

  private deleteActiveFolder() {

    this.deleteActiveFolderFromParent.emit(this.currentFileData.folder);
  }

  private async closeActiveFile(noDirtyWarnings: boolean = false) {

    if (!this.currentFileData) {
      return;
    }
    await this.activeFileIsClean().then((res: boolean) => {
      if (res === true) {
        this.closeFile.emit(this.currentFileData.path);
      } else {
        const dialog = this.dialog.open(UnsavedChangesDialogComponent, {
          width: '550px',
          data: this.currentFileData.name
        });
        dialog.afterClosed().subscribe((data: { save: boolean }) => {

          if (data && data.save === true) {
            this.saveActiveFile(true);
          } else if (data && data.save === false) {
            this.markEditorClean();
            this.closeFile.emit(this.currentFileData.path);
            this.setFocusToActiveEditor();
          } else {
            return;
          }
        });
      }
    });
  }

  private async executeActiveFile() {

    if (this.openFiles.length === 0 || !this.currentFileData.path.endsWith('.hl')) {
      return;
    }

    // Verifying document contains any actual code.
    const fileExisting: number = this.openFiles.findIndex((item: any) => item.path === this.currentFileData.path);
    const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
    const editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
    if (editor.getDoc().getValue() === '') {

      this.generalService.showFeedback('Active document contains no code', 'errorMessage');
      return;
    }
    const selectedText = editor.getSelection();

    this.generalService.showLoading();
    this.evaluatorService.execute(selectedText === '' ? this.currentFileData.content : selectedText).subscribe({

      next: (response: MagicResponse) => {

        this.generalService.hideLoading();
        this.dialog.open(ExecuteResult, {
          width: '900px',
          data: {
            hyperlambda: response.result,
          }
        });
      },

      error: (error: any) => {

        this.generalService.hideLoading();
        this.generalService.showFeedback(error?.error?.message ?? error, 'erroorMessage');
      }
    });
  }

  private activeFileIsClean() {

    return new Promise((resolve) => {
      const fileExisting: number = this.openFiles.findIndex((item: any) => item.path === this.currentFileData.path);
      const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
      if (activeWrapper) {
        const editor = (<any>activeWrapper.querySelector('.CodeMirror'))?.CodeMirror;
        if (editor) {
          resolve(editor.isClean())
        }
      }
      resolve(true);
    });
  }

  private markEditorClean(clearHistory: boolean = true) {
    
    const fileExisting: number = this.openFiles.findIndex((item: any) => item.path === this.currentFileData.path);
    const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
    const editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
    editor.doc.markClean();
    if (clearHistory) {
      editor.doc.clearHistory(); // To avoid having initial loading of file becoming an "undo operation".
    }
  }

  private renameFile() {

    if (!this.currentFileData) {
      return;
    }
    const dialog = this.dialog.open(RenameFileDialogComponent, {
      width: '550px',
      data: {
        name: this.currentFileData.name,
      },
    });
    dialog.afterClosed().subscribe((data: FileObjectName) => {
      if (data) {
        this.renameFileFromParent.emit({ file: this.currentFileData, newName: data.name });
      }
    });
  }

  private renameFolder() {

    if (!this.currentFileData) {
      return;
    }
    if (this.activeFolder === '/' || this.activeFolder === '/system/' || this.activeFolder === '/modules/') {
      this.generalService.showFeedback('You cannot rename system folders', 'errorMessage', 'Ok', 3000);
      return;
    }
    const dialog = this.dialog.open(RenameFolderDialogComponent, {
      width: '550px',
      data: {
        name: this.activeFolder
      },
    });
    dialog.afterClosed().subscribe((data: string) => {
      if (data) {
        this.renameFolderFromParent.emit({
          folder: this.activeFolder,
          newName: data,
        });
        this.activeFolder = this.activeFolder.substring(0, this.activeFolder.substring(0, this.activeFolder.length - 1).lastIndexOf('/') + 1) + data + '/';
      }
    });
  }

  private createNewFileObject(type: string) {

    this.createNewFileObjectFromParent.emit(type);
  }

  private previewActiveFile() {

    if (!this.currentFileData.path.endsWith('.md')) {
      return;
    }
    if (this.openFiles.length === 0) {
      return;
    }
    this.dialog.open(PreviewFileDialogComponent, {
      data: this.currentFileData.content,
    });
  }

  private insertSnippet() {

    if (!this.currentFileData.path.endsWith('.hl')) {
      return;
    }
    if (this.openFiles.length === 0) {
      return;
    }
    const dialogRef = this.dialog.open(LoadSnippetDialogComponent, {
      width: '550px',
    });
    dialogRef.afterClosed().subscribe((filename: string) => {
      if (filename) {
        this.evaluatorService.loadSnippet(filename).subscribe({
          next: (content: string) => {
            return this.insertHyperlambda(content);
          },
          error: (error: any) => this.generalService.showFeedback(error?.error?.message ?? error, 'errorMessage')
        });
      }
    });
  }

  private insertHyperlambda(content: string) {

    const fileExisting: number = this.openFiles.findIndex((item: any) => item.path === this.currentFileData.path);
    const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
    if (activeWrapper) {
      var editor = (<any>activeWrapper.querySelector('.CodeMirror'))?.CodeMirror;
      if (editor) {
        let result = '';
        const indentation = editor.doc.sel.ranges[0].anchor.ch;
        if (indentation % 3 !== 0) {
          this.generalService.showFeedback('Indentation must be modulo of 3', 'errorMessage', 'Ok', 5000);
          return;
        }
        const lines = content.trimEnd().split('\n');
        let first = true;
        for (let idx of lines) {
          if (first) {
            result += idx.trimEnd() + '\r\n';
            first = false;
          } else {
            result += ' '.repeat(indentation) + idx.trimEnd() + '\r\n';
          }
        }
        const doc = editor.getDoc();
        const cursor = doc.getCursor();
        const line = doc.getLine(cursor.line);
        const pos = {
          line: cursor.line,
          ch: line.length,
        };
        doc.replaceRange(result, pos);
      }
    }
  }

  private watchForActions() {

    this.codemirrorActionSubscription = this.codemirrorActionsService.action.subscribe((action: string) => {

      switch (action) {

        case 'save':
          this.saveActiveFile();
          break;

        case 'find':
          this.focusToFind.emit();
          break;

        case 'deleteFile':
          this.deleteActiveFile();
          break;

        case 'close':
          this.closeActiveFile();
          break;

        case 'renameFile':
          this.renameFile();
          break;

        case 'renameFolder':
          this.renameFolder();
          break;

        case 'insertSnippet':
          this.insertSnippet();
          break;

        case 'newFile':
          this.createNewFileObject('file');
          break;

        case 'newFolder':
          this.createNewFileObject('folder');
          break;

        case 'deleteFolder':
          this.deleteActiveFolder();
          break;

        case 'preview':
          this.previewActiveFile();
          break;

        case 'execute':
          this.executeActiveFile();
          break;

        case 'prompt':
          this.prompt();
          break;

        default:
          break;
      }
    })
  }

  private prompt() {

    const fileExisting: number = this.openFiles.findIndex((item: any) => item.path === this.currentFileData.path);
    const activeWrapper = document.querySelector('.active-codemirror-editor-' + fileExisting);
    const editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
    const selection = editor.getSelection();
    if (selection?.length > 0) {
      this.aiService.prompt(selection);
    }
  }

  private getCodeMirrorOptions() {

    const options = this.codemirrorActionsService.getActions(null, this.currentFileData?.path.split('.').pop());
    this.codemirrorOptions[this.currentFileData.path] = options;
    this.currentFileData.options = options;
  }
}