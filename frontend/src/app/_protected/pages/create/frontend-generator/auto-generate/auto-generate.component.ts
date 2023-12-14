
/*
 * Copyright (c) 2023 Thomas Hansen - For license inquiries you can contact thomas@ainiro.io.
 */

import { Component, OnInit } from '@angular/core';
import { GeneralService } from 'src/app/_general/services/general.service';
import { Endpoint } from 'src/app/_protected/models/common/endpoint.model';
import { BackendService } from 'src/app/_general/services/backend.service';
import { EndpointService } from '../../../../../_general/services/endpoint.service';
import { CrudifyService } from '../../../../../_general/services/crudify.service';
import { CodemirrorActionsService } from '../../../../../_general/services/codemirror-actions.service';
import { CommonErrorMessages } from 'src/app/_general/classes/common-error-messages';
import { CommonRegEx } from 'src/app/_general/classes/common-regex';

/**
 * Endpoint model class, for allowing user to select which endpoints
 * he or she wants to include in the generated frontend.
 */
class EndpointEx extends Endpoint {

  /**
   * Whether or not endpoint has been selected.
   */
  selected: boolean;
}

@Component({
  selector: 'app-auto-generate',
  templateUrl: './auto-generate.component.html',
  styleUrls: ['./auto-generate.component.scss']
})
export class AutoGenerateComponent implements OnInit {

  frontendTypes: any = FrontendTypes;
  frontendType: string = '';
  frontendName: string = '';
  isApp: boolean = true;
  colorPalettes: any = [];
  colorPalette: string = '';
  themes: any = [];
  theme: string = '';
  endpoints: EndpointEx[];
  databases: string[] = [];
  tables: any = [];
  template: string = '';
  copyRight: string = 'Automatically generated by Magic';
  codemirrorOptions: any;

  CommonRegEx = CommonRegEx;
  CommonErrorMessages = CommonErrorMessages;

  constructor(
    private crudifyService: CrudifyService,
    private generalService: GeneralService,
    private backendService: BackendService,
    private endpointsService: EndpointService,
    private codemirrorActionsService: CodemirrorActionsService) { }

  ngOnInit() {

    this.frontendType = this.frontendTypes[1].value;
    this.generalService.showLoading();
    this.getEndpoints();
    this.codemirrorOptions = this.codemirrorActionsService.getActions('html');
  }

  public changeFrontendType() {

    this.isApp = (this.frontendType === this.frontendTypes[1].value);

    if (!this.isApp) {
      this.theme = '';
      this.colorPalette = '';
    } else {
      this.colorPalette = this.colorPalettes[0].value;
      this.theme = this.themes[0].value;
    }
  }

  selectedEndpoints() {

    return this.endpoints.filter(x => x.selected).length;
  }

  moduleClicked(module: string) {

    const moduleEndpoints = this.endpoints.filter(x => x.path.startsWith('magic/modules/' + module + '/'));
    if (moduleEndpoints.filter(x => x.selected).length === moduleEndpoints.length) {
      for (const idx of moduleEndpoints) {
        idx.selected = false;
      }
    } else {
      for (const idx of moduleEndpoints) {
        let toBeSelected = true;
        for (var idx2 of moduleEndpoints.filter(x => x.selected && x.verb === idx.verb)) {
          const split1 = idx2.path.split('/');
          const split2 = idx.path.split('/');
          if (split1[split1.length - 1] === split2[split2.length - 1]) {
            toBeSelected = false;
          }
        }
        idx.selected = toBeSelected;
      }
    }
  }

  componentClicked(component: string) {

    const components = this.endpoints
      .filter(x => x.path.endsWith('/' + component) || x.path.endsWith('/' + component + '-count'));
    const shouldSelect = components.filter(x => !x.selected).length > 0;
    for (const idx of components) {
      idx.selected = shouldSelect;
    }
  }

  moduleSelected(module: string) {

    const moduleEndpoints = this.endpoints.filter(x => x.path.startsWith('magic/modules/' + module + '/'));
    if (moduleEndpoints.filter(x => x.selected).length === moduleEndpoints.length) {
      return true;
    } else {
      return false;
    }
  }

  componentSelected(component: string) {

    return this.endpoints
      .filter(x => x.selected)
      .filter(x => {
        return x.verb === 'get' && x.type === 'crud-count' && (x.path == 'magic/modules/' + component + '-count');
      }).length === 1;
  }

  generate(deployLocally: boolean = true) {

    if (this.frontendName === '') {
      this.generalService.showFeedback('Please give your fontend a name', 'errorMessage');
      return;
    }
    if (this.endpoints.length === 0) {
      this.generalService.showFeedback('No endpoints selected', 'errorMessage');
      return;
    }
    let apiUrl = this.backendService.active.url;
    while (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.substring(0, apiUrl.length - 1);
    }

    let args: any = {}
    if (this.isApp) {
      args = {
        intro: this.template,
        palette: this.colorPalette,
        theme: this.theme
      }
    }

    const svcModel = this.createServiceModel(this.endpoints.filter(x => x.selected));
    this.generalService.showLoading();
    this.crudifyService.generate(
      this.frontendType,
      apiUrl + '/',
      this.frontendName,
      this.copyRight === '' ? 'Automatically generated by Magic' : this.copyRight,
      svcModel,
      deployLocally,
      args,
      () => {
        this.generalService.hideLoading();
        this.generalService.showFeedback(deployLocally ? 'Success, edit the generated code in Frontend IDE' : 'Successfully generated', 'successMessage', 'Ok', 5000);
      },
      () => {
        this.generalService.showFeedback('Something went wrong as we tried to generate your frontend', 'errorMessage', 'Ok', 5000);
        this.generalService.hideLoading();
      });
  }

  /*
   * Private helper methods.
   */

  private createServiceModel(endpoints: any) {

    const result: any[] = [];
    for (const idx of endpoints) {
      const tmp = {
        auth: idx.auth,
        description: idx.description,
        path: idx.path,
        type: idx.type,
        verb: idx.verb,
        input: [],
        output: [],
      };
      if (idx.input && idx.input.length > 0) {
        idx.input.sort((lhs, rhs) => {
          if (lhs.name.toLowerCase() === 'name' && rhs.name.toLowerCase() !== 'name') {
            return -1;
          }
          if (lhs.name.toLowerCase() !== 'name' && rhs.name.toLowerCase() === 'name') {
            return 1;
          }
          if (lhs.name.toLowerCase() === 'name' && rhs.name.toLowerCase() === 'name') {
            return 0;
          }
          if (lhs.name.toLowerCase().indexOf('name') >= 0 && lhs.name.indexOf('.') === -1 &&
            (rhs.name.toLowerCase().indexOf('name') === -1 || rhs.name.indexOf('.') >= 0)) {
            return -1;
          }
          if (rhs.name.toLowerCase().indexOf('name') >= 0 && rhs.name.indexOf('.') === -1 &&
            (lhs.name.toLowerCase().indexOf('name') === -1 || lhs.name.indexOf('.') >= 0)) {
            return 1;
          }
          if (lhs.lookup && !rhs.lookup) {
            return -1;
          }
          if (!lhs.lookup && rhs.lookup) {
            return 1;
          }
          if (lhs.lookup && rhs.lookup) {
            return 0;
          }
          if (lhs.type === 'string' && rhs.type !== 'string') {
            return -1;
          }
          if (lhs.type !== 'string' && rhs.type === 'string') {
            return 1;
          }
          if (lhs.type === 'string' && rhs.type === 'string') {
            return 0;
          }
          if (lhs.type === 'date' && rhs.type !== 'date') {
            return -1;
          }
          if (lhs.type !== 'date' && rhs.type === 'date') {
            return 1;
          }
          if (lhs.type === 'date' && rhs.type === 'date') {
            return 0;
          }
          return 0;
        });

        for (const idxInput of idx.input) {
          const cur: any = {
            name: idxInput.name,
            type: idxInput.type,
          };
          if (idxInput.lookup) {
            cur.lookup = idxInput.lookup;
            cur.lookup.service = idx.path.substring(14);
            cur.lookup.service = cur.lookup.service.substring(0, cur.lookup.service.indexOf('/')) + '.' + cur.lookup.table;
            while (cur.lookup.service.indexOf('-') > 0) {
              cur.lookup.service = cur.lookup.service.replace('-', '_');
            }
            while (cur.lookup.service.indexOf('.') > 0) {
              cur.lookup.service = cur.lookup.service.replace('.', '_');
            }
          }
          if (idxInput.handling) {
            cur.handling = idxInput.handling;
          }
          tmp.input.push(cur);
        }
      }
      if (idx.output && idx.output.length > 0) {
        idx.output.sort((lhs, rhs) => {
          if (lhs.name.toLowerCase() === 'name' && rhs.name.toLowerCase() !== 'name') {
            return -1;
          }
          if (lhs.name.toLowerCase() !== 'name' && rhs.name.toLowerCase() === 'name') {
            return 1;
          }
          if (lhs.name.toLowerCase() === 'name' && rhs.name.toLowerCase() === 'name') {
            return 0;
          }
          if (lhs.name.toLowerCase().indexOf('name') >= 0 && lhs.name.indexOf('.') === -1 &&
            (rhs.name.toLowerCase().indexOf('name') === -1 || rhs.name.indexOf('.') >= 0)) {
            return -1;
          }
          if (rhs.name.toLowerCase().indexOf('name') >= 0 && rhs.name.indexOf('.') === -1 &&
            (lhs.name.toLowerCase().indexOf('name') === -1 || lhs.name.indexOf('.') >= 0)) {
            return 1;
          }
          if (lhs.lookup && !rhs.lookup) {
            return -1;
          }
          if (!lhs.lookup && rhs.lookup) {
            return 1;
          }
          if (lhs.lookup && rhs.lookup) {
            return 0;
          }
          if (idx.type === 'crud-read') {
            let lhsIsLinked = false;
            if (lhs.name.indexOf('.') > 0) {
              const firstSplit = lhs.name.split('.')[0];
              const urlSplit = idx.path.split('/');
              if (firstSplit !== urlSplit[urlSplit.length]) {
                lhsIsLinked = true;
              }
            }
            let rhsIsLinked = false;
            if (rhs.name.indexOf('.') > 0) {
              const firstSplit = rhs.name.split('.')[0];
              const urlSplit = idx.path.split('/');
              if (firstSplit !== urlSplit[urlSplit.length]) {
                rhsIsLinked = true;
              }
            }
            if (lhsIsLinked && !rhsIsLinked) {
              return -1;
            }
            if (!lhsIsLinked && rhsIsLinked) {
              return 1;
            }
            if (lhsIsLinked && rhsIsLinked) {
              return 0;
            }
          }
          if (lhs.type === 'string' && rhs.type !== 'string') {
            return -1;
          }
          if (lhs.type !== 'string' && rhs.type === 'string') {
            return 1;
          }
          if (lhs.type === 'string' && rhs.type === 'string') {
            return 0;
          }
          if (lhs.type === 'date' && rhs.type !== 'date') {
            return -1;
          }
          if (lhs.type !== 'date' && rhs.type === 'date') {
            return 1;
          }
          if (lhs.type === 'date' && rhs.type === 'date') {
            return 0;
          }
          return 0;
        });
        for (const idxOutput of idx.output) {
          const cur: any = {
            name: idxOutput.name,
            type: idxOutput.type || tmp.input[idxOutput.name + '.eq'],
          };
          if (idxOutput.handling) {
            cur.handling = idxOutput.handling;
          }
          if (idxOutput.lookup) {
            cur.lookup = idxOutput.lookup;
            cur.lookup.service = idx.path.substring(14);
            cur.lookup.service = cur.lookup.service.substring(0, cur.lookup.service.indexOf('/')) + '.' + cur.lookup.table;
            while (cur.lookup.service.indexOf('.') > 0) {
              cur.lookup.service = cur.lookup.service.replace('.', '_');
            }
          }
          tmp.output.push(cur);
        }
      }
      result.push(tmp);
    }
    return result;
  }

  private getComponents() {

    this.tables = this.endpoints
      .filter(x => x.type === 'crud-count')
      .map(x => {
        const componentName = x.path.substring(14);
        return {
          name: componentName.substring(0, componentName.length - 6),
          selected: true
        };
      });
  }

  private getEndpoints() {

    this.endpointsService.endpoints().subscribe({
      next: (endpoints: Endpoint[]) => {

        if (endpoints) {
          this.endpoints = endpoints
            .filter((x: any) => !x.path.startsWith('magic/system/') && !x.path.startsWith('magic/modules/magic/'))
            .filter((x: any) => x.type === 'crud-count' || x.type === 'crud-delete' || x.type === 'crud-read' || x.type === 'crud-create' || x.type === 'crud-update')
            .map((x: any) => {
              return {
                path: x.path,
                verb: x.verb,
                consumes: x.consumes,
                produces: x.produces,
                input: x.input,
                output: x.output,
                array: x.array,
                auth: x.auth,
                type: x.type,
                description: x.description,
                selected: true,
              };
            });

          const modules: any = [];
          for (const idx of this.endpoints) {
            let moduleName = idx.path.substring('magic/modules/'.length);
            moduleName = moduleName.substring(0, moduleName.indexOf('/'));
            if (modules.findIndex((item: any) => item.name === moduleName) === -1) {
              modules.push({ name: moduleName, selected: true });
            }
          }
          this.databases = modules;
          this.getComponents();
          this.getPalette();
        }
      },
      error: (error: any) => {
        
        this.generalService.showFeedback(error?.error?.message ?? error, 'errorMessage');
      }
    });
  }

  private getPalette() {

    this.crudifyService.templateCustomArgs(this.frontendType).subscribe({
      next: (res: any) => {

        this.generalService.hideLoading();
        if (res) {
          this.colorPalettes = res?.palette || [];
          this.colorPalette = this.colorPalettes[0].value;
          this.themes = res?.theme || [];
          this.theme = this.themes[0].value;
          this.template = res?.intro;
        }
      },
      error: (error: any) => {

        this.generalService.hideLoading();
        this.generalService.showFeedback(error?.error?.message ?? error, 'errorMessage');
      }
    });
  }
}

const FrontendTypes: any = [
  {
    name: 'Angular service',
    value: 'angular-service'
  },
  {
    name: 'Angular application',
    value: 'angular'
  }
]
