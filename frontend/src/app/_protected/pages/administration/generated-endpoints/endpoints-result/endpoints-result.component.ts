import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpTransportType, HubConnectionBuilder } from '@aspnet/signalr';
import { DomSanitizer } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';

import { Argument } from '../../../administration/generated-endpoints/_models/argument.model';
import { EndpointService } from '../_services/endpoint.service';
import { GeneralService } from 'src/app/_general/services/general.service';
import { BackendService } from 'src/app/_protected/services/common/backend.service';

// CodeMirror options.
import json from '../../../../../codemirror/options/json.json';
import markdown from '../../../../../codemirror/options/markdown.json';
import hyperlambda from '../../../../../codemirror/options/hyperlambda.json';
import json_readonly from '../../../../../codemirror/options/json_readonly.json';
import markdown_readonly from '../../../../../codemirror/options/markdown_readonly.json';
import hyperlambda_readonly from '../../../../../codemirror/options/hyperlambda_readonly.json';
import { FormBuilder, FormControl } from '@angular/forms';

/*
 * Result of invocation.
 */
export class InvocationResult {
  status: number;
  statusText: string;
  response: string;
  blob: any;
  responseType: string;
}

@Component({
  selector: 'app-endpoints-result',
  templateUrl: './endpoints-result.component.html',
  styleUrls: ['./endpoints-result.component.scss']
})
export class EndpointsResultComponent implements OnInit {

  @Input() itemToBeTried!: Observable<any>;

  private originalPath: string = '';
  public itemDetails: any = {};

  public parameters: any = [];

  /**
   * CodeMirror options object, taken from common settings.
   */
  cmOptions = {
    json: json,
  };

  /**
   * CodeMirror options object, taken from common settings.
   */
  cmOptionsHyperlambda = {
    json: hyperlambda,
  };

  /**
   * CodeMirror options object, taken from common settings.
   */
  cmOptionsMarkdown = {
    json: markdown,
  };

  /**
   * CodeMirror options object, taken from common settings.
   */
  cmOptionsReadonly = {
    json: json_readonly,
  };

  /**
   * CodeMirror options object, taken from common settings.
   */
  cmHlOptionsReadonly = {
    hl: hyperlambda_readonly,
  };

  /**
   * CodeMirror options object, taken from common settings.
   */
  markdownOptionsReadonly = {
    md: markdown_readonly,
  };

  /**
   * Payload example for JSON type of endpoints.
   */
  payload: string = null;

  /**
   * Result of invocation.
   */
  result: InvocationResult = null;

  public isExecuting: boolean = false;

  public paramsForm = this.formBuilder.group({});

  constructor(
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private formBuilder: FormBuilder,
    public backendService: BackendService,
    private generalService: GeneralService,
    private endpointService: EndpointService) { }

  ngOnInit(): void {
    this.getItemDetails();
  }

  private getItemDetails() {
    this.itemToBeTried.subscribe((value: any) => {
      if (value && Object.keys(value).length) {
        this.itemDetails = [];
        this.parameters = [];
        this.result = null;
        this.paramsForm = this.formBuilder.group({});
        this.prepareData(value);
      }
    });
  }

  private prepareData(item: any) {
    this.itemDetails = item;
    this.originalPath = item.path;

    item.input ? this.setForm() : '';
    this.getParams();

    if (this.itemDetails.consumes === 'application/json') {
      let payload = {};
      for (var idx of this.itemDetails.input ?? []) {
        let type: any = idx.type;
        switch (type) {

          case "long":
          case "ulong":
          case "int":
          case "uint":
          case "short":
          case "ushort":
            type = 42;
            break;

          case "date":
            type = new Date().toISOString();
            break;

          case "bool":
            type = true;
            break;

          case "string":
            type = "foo";
            break;

          case "decimal":
          case "float":
          case "double":
            type = 5.5;
            break;
        }
        payload[idx.name] = type;
      }
      setTimeout(() => this.payload = JSON.stringify(payload, null, 2), 250);
      setTimeout(() => {
        document.querySelectorAll('.CodeMirror').forEach(item => {
          var domNode = (<any>item);
          var editor = domNode.CodeMirror;
          editor.doc.markClean();
          editor.doc.clearHistory(); // To avoid having initial loading of file becoming an "undo operation".
        })
      }, 800);

    } else if (this.itemDetails.consumes === 'application/x-hyperlambda') {
      setTimeout(() => this.payload = '', 250);
    } else if (this.itemDetails?.consumes?.startsWith('text/')) {
      setTimeout(() => this.payload = '', 250);
    }

    this.cdr.detectChanges();
  }

  private getParams() {
    this.parameters = (this.itemDetails.input as any)?.map((item: any) => { return item.name }) || [];
  }

  private setForm() {
    this.itemDetails.input.forEach((element: any) => {
      this.paramsForm.setControl(element.name, new FormControl<any>(''));
    });

    this.cdr.detectChanges();
  }

  /**
   * Returns arguments for endpoint.
   *
   * @param args List of all arguments for endpoint
   * @param controlArguments Whether or not to return control arguments or non-control arguments
   */
  public getArguments(args: Argument[], controlArguments: boolean) {
    if (this.itemDetails.type === 'crud-read' || this.itemDetails.type === 'crud-count') {
      return args.filter(x => {
        switch (x.name) {
          case 'operator':
          case 'limit':
          case 'offset':
          case 'order':
          case 'direction':
          case 'recaptcha':
            return controlArguments;
          default:
            return !controlArguments;
        }
      });
    } else {
      if (controlArguments) {
        return [];
      }
      return args;
    }
  }

  /**
   * Returns tooltip information for specified argument.
   *
   * @param arg Argument to retrieve tooltip for
   */
  public getDescription(arg: any) {
    if (this.itemDetails.type === 'crud-read' || this.itemDetails.type === 'crud-count') {
      switch (arg.name) {

        case 'operator':
          return 'Boolean operator to use for conditions, defaults to \'and\'';

        case 'limit':
          return 'Maximum number of items to return, defaults to 25';

        case 'offset':
          return 'Offset from where to return items';

        case 'order':
          return 'Column to sort by';

        case 'direction':
          return 'Direction to sort by, defaults to \'asc\'';

        default:
          if (arg.name.indexOf('.') !== -1) {
            const comparison = arg.name.substring(arg.name.lastIndexOf('.') + 1);
            const field = arg.name.substring(0, arg.name.lastIndexOf('.'));
            switch (comparison) {

              case 'eq':
                return `'${field}' equal to ${arg.type}`;

              case 'neq':
                return `'${field}' not equal to ${arg.type}`;

              case 'mteq':
                return `'${field}' more than or equal to ${arg.type}`;

              case 'lteq':
                return `'${field}' less than or equal to ${arg.type}`;

              case 'lt':
                return `'${field}' less than ${arg.type}`;

              case 'mt':
                return `'${field}' more than ${arg.type}`;

              case 'like':
                return `'${field}' contains ${arg.type}`;

              default:
                return '';
            }
          } else {
            return arg.type;
          }
      }
    } else {
      return `${arg.name} equals to`
    }
  }

  /**
   * Returns true if endpoint can be invoked.
   *
   * Notice, we don't support invoking endpoints with for instance application/octet-stream types
   * of input, since we don't have the means to supply the required input to these endpoints.
   */
  canInvoke() {
    return this.itemDetails?.verb === 'get' ||
      this.itemDetails?.verb === 'delete' ||
      this.itemDetails?.consumes === 'application/json' ||
      this.itemDetails?.consumes === 'application/x-hyperlambda' ||
      this.itemDetails?.consumes?.startsWith(<String>'text/');
  }

  /**
     * Invoked when user wants to invoke endpoint.
     */
  invoke() {
    this.itemDetails.path = this.originalPath;
    if (Object.values(this.paramsForm.value).length) {
      let url: string = `${this.itemDetails.path}`;
      url += '?';
      for (const key in this.paramsForm.value) {
        if (this.paramsForm.value[key]) {
          const type: string = this.itemDetails.input.find((element: any) => element.name === key).type;
          if (type === 'date') {
            url += key + '=' + encodeURIComponent(new Date(this.paramsForm.value[key]).toISOString()) + '&';
          } else {
            url += key + '=' + encodeURIComponent(this.paramsForm.value[key]) + '&';
          }
        }
      }
      this.itemDetails.path = url.substring(0, url.length - 1);
    }

    this.isExecuting = true;
    let responseType = '';
    if (this.itemDetails.produces === 'application/json') {
      responseType = 'json';
    } else if (this.itemDetails.produces === 'application/x-hyperlambda') {
      responseType = 'hyperlambda';
    } else if (this.itemDetails.produces.startsWith('text')) {
      responseType = 'text';
    } else {
      responseType = 'blob';
    }
    try {
      let invocation: Observable<any> = null;
      switch (this.itemDetails.verb) {

        case 'get':
          invocation = this.endpointService.get(`/${this.itemDetails.path}`, responseType);
          break;

        case 'delete':
          invocation = this.endpointService.delete(`/${this.itemDetails.path}`, responseType);
          break;

        case 'post':
          {
            const payload = this.itemDetails.consumes === 'application/json' ? JSON.parse(this.payload) : this.payload;
            invocation = this.endpointService.post(`/${this.itemDetails.path}`, payload, responseType);
          }
          break;

        case 'put':
          {
            const payload = this.itemDetails.consumes === 'application/json' ? JSON.parse(this.payload) : this.payload;
            invocation = this.endpointService.put(`/${this.itemDetails.path}`, payload, responseType);
          }
          break;

        case 'patch':
          {
            const payload = this.itemDetails.consumes === 'application/json' ? JSON.parse(this.payload) : this.payload;
            invocation = this.endpointService.patch(`/${this.itemDetails.path}`, payload, responseType);
          }
          break;

        case 'socket':
          let builder = new HubConnectionBuilder();
          const hubConnection = builder.withUrl(this.backendService.active.url + '/sockets', {
            accessTokenFactory: () => this.backendService.active.token.token,
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets,
          }).build();

          hubConnection.start().then(() => {
            let success = true;
            const url = `/${this.itemDetails.path}`.substring(14);
            hubConnection
              .invoke('execute', url, this.payload)
              .catch(() => {
                this.generalService.showFeedback('Something went wrong as we tried to invoke socket endpoint');
                success = false;
                this.isExecuting = false;
              })
              .then(() => {
                hubConnection.stop();
                if (success) {
                  this.isExecuting = false;
                  this.generalService.showFeedback('Socket invocation was successful');
                }
              });
          });
          break;
      }

      if (invocation) {
        const startTime = new Date();
        invocation.subscribe({
          next: (res: any) => {
            const endTime = new Date();
            const timeDiff = endTime.getTime() - startTime.getTime();
            const response = responseType === 'json' ? JSON.stringify(res.body || '{}', null, 2) : res.body;
            this.result = {
              status: res.status,
              statusText: res.statusText + ' in ' + new Intl.NumberFormat('en-us').format(timeDiff) + ' milliseconds',
              response: response,
              blob: null,
              responseType,
            };
            if (responseType === 'blob') {
              const objectUrl = URL.createObjectURL(response);
              this.result.blob = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
            }
            this.isExecuting = false;
          },
          error: (error: any) => {
            this.isExecuting = false;
            this.result = {
              status: error.status,
              statusText: error.statusText,
              response: JSON.stringify(error.error || '{}', null, 2),
              blob: null,
              responseType,
            };
          }
        });
      }
    }
    catch (error) {
      this.isExecuting = false;
      this.generalService.showFeedback(error);
    }
  }

  /**
   * Returns whether or not the current invocation was successful or not.
   */
  isSuccess() {
    return this.result && this.result.status >= 200 && this.result.status < 400;
  }

  public inputTypes(item: string) {
    switch (item) {

      case 'bool':
        return 'text';
        break;

      case 'string':
        return 'text';
        break;

      case 'long':
      case 'int':
      case 'uint':
      case 'short':
      case 'ushort':
        return 'number';
        break;

      case 'date':
        return 'date';
        break;
    }
  }

  public copyResult(response: any) {
    this.clipboard.copy(response);
    this.generalService.showFeedback('Result is copied to your clipboard');
  }
}
