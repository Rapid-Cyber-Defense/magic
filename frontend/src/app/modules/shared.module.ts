
/*
 * Copyright (c) 2023 Thomas Hansen - For license inquiries you can contact thomas@ainiro.io.
 */

import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DateSincePipe } from "../pipes/date-since.pipe";
import { MarkedPipe } from "../pipes/marked.pipe";
import { DatePipe } from "../pipes/date.pipe";
import { SortByPipe } from "../pipes/sort-by.pipe";
import { MaterialModule } from "./material.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CodemirrorModule } from "@ctrl/ngx-codemirror";

@NgModule({
  declarations: [
    DateSincePipe,
    DatePipe,
    MarkedPipe,
    SortByPipe,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CodemirrorModule,
  ],
  exports: [
    FormsModule,
    ReactiveFormsModule,
    DateSincePipe,
    DatePipe,
    MarkedPipe,
    SortByPipe,
    MaterialModule,
    CodemirrorModule,
  ]
})
export class SharedModule { }