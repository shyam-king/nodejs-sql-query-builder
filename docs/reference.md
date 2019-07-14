# Reference for npm package: sync-mysql-database

## class Database
### constructor (auth, struct)
The constructor creates a internal sql reference `Database.sql` of `sync-mysql` type using the values in `auth`. The required fields
of `auth` are:
  * `user`: username of MySQL database
  * `host`: Server hosting MySQL
  * `passsword`: password for user if applicable
  * `database`: database to be managed

`struct` describes the general structure of the database. The fields include:
  * required:
    * `version` :` string` <br>
      It denotes the current version of structure of the database. This version is stored in table `metadata` of the database. Whenever
      the `version` changes (it can be any other string) the database is cleared (all tables with names matching with the new structure are
      dropped if they exist). Therefore, change the value of `version` only when there is a change in structure of existing tables. `version`
      need not be changed if only new tables are added.
    
      > "changing structure" of a table refers to any change to its columns field.
    
      **Note:** If the structure of the table changes but the version is not changed then the new tables are not created in the database
      therefore it may cause errors.
      
  * other fields:
    * `tables`: *array* containing fields
      * `name`: *string* - name of the table
      * `columns`: *array* containing fields
        * `name`: *string* - name of the column
        * `type`: *string* - MySQL DATATYPE
        * `constraints` (*) : *string* - constraints for the column
      * `primary_key` (*): *string* - name of the column (or) *array of string* - name of the columns
      > (*) -> optional fields
    * `preupdate_queies` : *array of string* <br>
      The list of queries to be executed before deleting the tables whenever the structure changes (i.e. `version` does not match).

### Properties
> This lists only the properties that are "useful" the class may have other properties as well which are used for logics within
the class

* `sql`: *sync-mysql*<br>
  This property refers to the `sync-mysql` reference that the class uses. This property can be used to run raw queries when the Query class may seem insufficent.
  
### Methods
> This lists only the methods that are "useful" the class may have other methods as well which are used for logics within
the class

* `getTable(table_name)`:<br>
  returns a `Table` refernce referring to the Table with name `table_name`. 
  > Note that `table_name` is checked in the `struct` and not in the database. Therefore if the database had a table which is not described in `struct` it cannot be accessed using `getTable()`. Use the `Table` class instead.
