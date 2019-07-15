# nodejs-sync-mysql-database
A NodeJS package to manage a MySQL Database Synchronously (this is a wrapper around sync-mysql package)

## Installation
```sh
npm install --save sync-mysql-database
```

## Usage (Skeleton)
* auth.json
```json
{
  "user": "username",
  "host": "localhost",
  "password": "password",
  "database": "sampleDatabase"
}
```
*Note: The database field is required unlike in sync-mysql where you can use `USE <DATABASE>` query.

* structure.json
```json
{
  "version": "1",
  "tables": [
    {
      "name": "users",
      "columns" : [
        {"name": "id", "type": "INTEGER", "constraints": "auto_increment"},
        {"name": "username", "type": "varchar(20)"},
        {"name": "password", "type": "char(20)"}
      ],
      "primary_key": "id"
    }
  ]
}
```

* main.js
```js
const Database = require("sync-mysql-database").Database;
const auth = require("./auth.json");
const struct = require("./structure.json");

var sampleDatabase = new Database(auth, struct);

sampleDatabase.getTable("users").query().select("username", "password").insert("user1", "password");
console.log(sampleDatabase.getTable("users").query().get());
```

## Reference
[Check docs/](docs/reference.md)
