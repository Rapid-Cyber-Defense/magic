
/*
 * Copyright (c) Aista Ltd, 2021 - 2023 info@aista.com, all rights reserved.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ComponentsModule } from 'src/app/_general/components/components.module';
import { MachineLearningTrainingComponent } from '../machine-learning-training/machine-learning.component';
import { MachineLearningTrainingRoutingModule } from './machine-learning.routing.module';

@NgModule({
  declarations: [
    MachineLearningTrainingComponent,
  ],
  imports: [
    CommonModule,
    MachineLearningTrainingRoutingModule,
    MaterialModule,
    FormsModule,
    ComponentsModule,
  ]
})
export class MachineLearningTrainingModule { }
