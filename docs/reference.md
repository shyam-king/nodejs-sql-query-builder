# Reference for npm package: sync-mysql-database

## class `Database`
### constructor (auth, struct)
The constructor creates a internal sql reference `Database.sql` of `sync-mysql` type using the values in `auth`. The **required** fields
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
      * `constraints` (*): *string* or *array of string* -> constraints to be applied (foreign key, etc.)
    * `preupdate_queies` (*) : *array of string* <br>
      The list of queries to be executed before deleting the tables whenever the structure changes (i.e. `version` does not match).

      > (*) : optional fields

### Properties
> This lists only the properties that are "useful" the class may have other properties as well which are used for logics within
the class

* `sql`: *sync-mysql*<br>
  This property refers to the `sync-mysql` reference that the class uses. This property can be used to run raw queries when the Query class may seem insufficent. [sync-mysql package details](https://www.npmjs.com/package/sync-mysql)
  
### Methods
> This lists only the methods that are "useful" the class may have other methods as well which are used for logics within
the class

* `getTable(table_name): Table`<br>
  returns a `Table` reference referring to the Table with name `table_name`. 
  
  > Note that `table_name` is checked in the `Database.struct` and not in the database. Therefore if the database had a table which is not described in `struct` it cannot be accessed using `getTable()`. Use `createTable()` to add the table to `Database.struct` before calling `getTable()`.

* `createTable(struct): Table`<br>
  Creates the table in the database if it does not already exist, adds the structure to `Database.struct` enabling access from `getTable()` method. Returns a `Table` reference referring to the new Table. 

  > **Note:** Suppose the database already contains a table with the name `struct.name`, it **will not be deleted**. Therefore, if the table in the database has a different structure compared to `struct` it may cause issues. Use `createNewTable()` to delete the table if exists and create a new one following the `struct`. Use `updateDatabase()` method to fetch new tables from the database and sync it with `Database.struct`.

* `createNewTable(struct): Table`<br>
  Same as `createTable()` but deletes the table with the same name in the database if it already exists.

* `updateDatabase()`<br>
  Updates the `Database.struct` with all the tables in the SQL database. It parses table `name`, `columns` (`name`, `type`, **does not parse constraints**) and `primary_key`. 

## class `Table`
> The constructor is not described here because the user cannot instantiate an instance of `Table` directly. To obtain an instance of `Table` use one of the `createTable()`, `createNewTable()`, `getTable()` methods of a `Database` instance.

### Methods

* `row(id): Array`<br>
  returns an array containing a single row of the table with `primary_key` matching with `id`. If there is no `primary_key`, nothing is returned (`undefined`).

* `query(): Query`<br>
  returns an instance of `Query` class that can be used to run queries on the table.

## class `Query`
> The constructor is not described here because the user cannot instantiate an instance of `Query` directly. To obtain an instance of `Query` use `query()` method of a `Table` instance. The `Query` instance returned is '"bound to" the corresponding `Table`.

### Overview
The `Query` class is used to run a MySQL query on the corresponding table. All queries are run on the table that the instance is bound to.<br>

The `Query` class is used to run  a query in two steps:
1. Build a query
2. Execute the query

#### Building the query
The query is built by chaining methods `select()`, `where()`, `orderby()`, etc.<br><br>
For example,
```JS
//database is a Database instance
let query1 = database.getTable("sampleTable").query().select("username", "age").where("age > 18");
let query2 = database.getTable("sampleTable").query().select("id", "username", "age");
```

#### Executing a query
After the query is built, it can be run using `get()`, `insert()`, `delete()`, etc. methods.<br>

For example,
```JS
query2.insert(100, "some guy", 29);
query1.get();
query1.delete();
```

> *Note:* These methods can be chained as well.

### Methods

  > Methods that return `Query` instances can be used to chain calls.

  * `select(... args): Query`<br>
    applies projection operation (selecting columns) using `args`. `args` represent the column names.
    The returned `Query` instance has the selection applied which can be used for further chaining or running the query. If a `Query` instance has had no calls to `select()`, all columns are projected by default.

    ```JS
    //database is a Database instance
    database.getTable("sampleTable").query().select("username").get();
    ```

    If `select()` is called without arguments, every column is projected. Multiple calls to `select()` for the same `Query` instance will result in projection corresponding to the final `select()` call.

  * `where(where_clause): Query`<br>
    applies selection operation (filtering of rows). `where_clause` (:`string`) is a valid SQL condition statements (do not put "WHERE condition" instead just put "condition"). 

    ```JS
    //database is a Database instance
    database.getTable("sampleTable").query().select("username").where("age > 18").get();
    ```

    Multiple calls to `where()` result in rows that satisfy all the conditions.

    ```JS
    //database is a Database instance
    database.getTable("sampleTable").query().where("age > 18").where("gender = 'F'").get();
    //this is equivalent
    database.getTable("sampleTable").query().where("age > 18 AND gender = 'F'").get();
    ```

    > The multiple `where()` calls result in a where clause in the following way:
      ```JS 
      ... query().where("cond1").where("cond2").where("cond3")...
      ```
    > results to a SQL WHERE clause:
      ```sql
      ... WHERE (((cond1) AND cond2) AND cond3)...
      ```

  * `orderby(col, order): Query`<br>
    sorts the returned rows. `col` represents the column to be used for sorting. `order` represents the order to sort in (`"asc"` or `"desc"`). If `order` is not specified, it is `"asc"` by default. 

    ```JS
    ... query().select("username", "id").orderby("username");
    ```

    Subsequent calls to `orderby()` describes secondary sorting rules when there is ambiguity.

    ```JS
    ... query().select("userame", "id").orderby("username").orderby("id", "desc");
    ```

  * `get(): Array`<br>
    runs a SELECT query and returns the response.

    ```JS
    ... query().select("username").get();
    ```

  * `getValue()`<br>
    runs the SELECT query and returns the value of the first column of the first row. If the query results in no rows, then `undefined` is returned.
  
  * `delete()`<br>
    runs a DELETE query and returns the response. Use `where()` method to select rows to delete. By default all rows will be deleted.

    ```JS
    ... query().where("age > 18").delete();
    ```
  
  * `insert(.. args)`<br>
    runs an INSERT query and returns the response. `args` represent the values to be inserted. Use `select()` to select columns to which values are being supplied. By default values to all the columns are expected. It returns the response after executing the query.

    ```JS
    ... query().select("username", "age").insert("some guy", 18);
    ```

  * `update(... vals)`<br>
    updates the value of the column of rows selected using `where()`. The columns to update are set using the `select()` method. `update()` throws an error if there were no `select()` methods called or when insufficent columns were selected. `vals` describe the values to be set.

    ```JS
    let age = table.query().where("username = 'some guy'").select("age", "username");
    age.update(age.getValue() + 1, "some guy but new");
    ```

    > No errors are thrown if more columns are selected compared to the number of values provided.