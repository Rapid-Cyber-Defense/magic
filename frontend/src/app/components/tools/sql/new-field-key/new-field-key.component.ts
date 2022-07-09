
/*
 * Magic Cloud, copyright Aista, Ltd. See the attached LICENSE file for details.
 */

// Angular and system imports.
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Model for creating a new field or key in the specified table.
 */
export class NewFieldKeyModel {
  databaseType: string;
  connectionString: string;
  table: string;
  database: any;
  type: string;
  field: string;
  datatype: string;
  foreignTable: string;
  foreignField: string;
  fkName: string;
}

/**
 * Component allowing user to create a new field or foreign key.
 */
@Component({
  selector: 'app-new-field-key',
  templateUrl: './new-field-key.component.html',
  styleUrls: ['./new-field-key.component.scss']
})
export class NewFieldKeyComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: NewFieldKeyModel) { }

  /**
   * Returns all fields in table to caller.
   */
  getFields() {
    return this.data.database.tables.filter(x => x.name === this.data.table)[0].columns;
  }

  /**
   * Returns the supported datatypes for the specified database type to caller.
   */
  getDataTypes() {
    switch (this.data.databaseType) {

      case 'mysql':
        return [
          'varchar',
          'boolean',
          'smallint',
          'int',
          'decimal',
          'datetime',
          'timestamp',
        ];

      case 'sqlite':
        return [
          'integer',
          'varchar',
          'text',
        ];
      }
  }

  /**
   * Returns all tables in database to caller.
   */
  getTables() {
    return this.data.database.tables.map((x: any) => x.name);
  }

  /**
   * Returns all fields in specified table to caller.
   */
  getForeignField(table: string) {
    return this.data.database.tables.filter((x: any) => x.name == table)[0].columns.map((x: any) => x.name);
  }
}
