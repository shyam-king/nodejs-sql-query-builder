(function () {
    const mysql = require("sync-mysql");

    //classes to handle access to database
    class Query {
        constructor (sql, table_name) {
            this.query = ";";
            this.selection = '*';
            this.sql = sql;
            this.table = table_name;
        }

        select(... selection) {
            if (selection == undefined) {
                this.selectAll();
            } 
            this.selection = selection.join(",");
            
            return this;
        }

        where(where_clause) {
            this.where_clause = " WHERE " + where_clause;
            return this;
        }

        orderby(order, col) {
            if (this.order == undefined) {
                this.order = "";
            }
            else {
                this.order+= ", ";
            }

            this.order += `${col} ${order}`;
            return this;
        }

        selectAll() {
            this.selection = "*";
            return this;
        }

        get() {
            this.query = `SELECT ${this.selection} FROM ${this.table}`;
            if (this.where_clause) {
                this.query += this.where_clause;
            }
            if (this.order) {
                this.query += ` ORDER BY ${this.order}`;
            }
            this.query += ';';
            return this.sql.query(this.query);
        }

        delete() {
            this.query = `DELETE FROM ${this.table}`;
            if(this.where_clause) {
                this.query += this.where_clause;
            }
            this.query += ";"

            return this.sql.query(this.query);
        }

        insert (... values) {
            for (let i = 0; i < values.length; i++) {
                if (typeof(values[i]) == "string") {
                    values[i] = `"${values[i]}"`;
                }
            }

            this.query = `INSERT INTO ${this.table}(${(this.selection == "*") ? "" : this.selection}) VALUES (${values.join(",")});`;
            return this.sql.query(this.query);
        }
    }

    class Table {
        constructor(sql, table_name, struct) {
            this.name = table_name;
            this.sql = sql;
            this.structure = struct;
        }

        query() {
            return new Query(this.sql, this.structure.name);
        }

        row(id) {
            if (typeof(id) == "string") {
                id = `"${id}"`
            }
            if (this.structure.primary_key) {
                return this.query().where(`${this.structure.primary_key} = ${id}`).get();
            }
        }
    }

    class Database {
        constructor (auth, struct) {
            this.auth = auth;
            this.struct = struct;
            this.sql = new mysql(auth);

            let sql = this.sql, result;

            //initiate database
            sql.query(`CREATE TABLE IF NOT EXISTS metadata(field varchar(15), value text);`);
            result = sql.query(`SELECT value FROM metadata WHERE field = 'version'`);
            if (result.length == 0) {
                sql.query(`INSERT INTO metadata (field, value) VALUES ('version', '${struct.version}')`);
            } 
            else if (result[0].value != struct.version) {
                sql.query(`UPDATE metadata SET value = '${struct.version}' WHERE field = 'version'`);
                if (struct.preupdate_queries.length > 0) {
                    struct.preupdate_queries.forEach((q) => {
                        sql.query(q);
                    });
                }
                this.deleteTables();
            }

            //safely create tables if they don't exist
            this.createTables();
        }

        getTable(table_name) {
            let struct;
            this.struct.tables.forEach ((element)=>{
                if (element.name == table_name)
                    struct = element;
            });

            if (struct == undefined) 
                throw `No such table '${table_name}' exists in the database.`;

            return new Table(this.sql, table_name, struct);
        }

        createTables () {
            this.struct.tables.forEach(element => {
                let q = `CREATE TABLE IF NOT EXISTS ${element.name} (`;
                element.columns.forEach((column, index, array) => {
                    q += `${column.name} ${column.type} ${(column.constraints != undefined)?column.constraints:""}`;
                    if (index < array.length - 1) q += ',';
                });
                if (element.primary_key != undefined) {
                    q += `, primary key (${element.primary_key})`;
                }
                q += ');'
    
                this.sql.query(q);
            });
        };
    
        deleteTables() {
            console.log(`The database ${auth.database} is being cleared prior to updating structure.`);
            let q = 'DROP TABLE IF EXISTS <tablename>;';
            this.struct.tables.forEach((element)=>{
                this.sql.query(q.replace("<tablename>", element.name));
            });
        }

        createTable(struct) {
            this.struct.tables.append(struct);
            let q = `CREATE TABLE IF NOT EXISTS ${struct.name} (`;
            struct.columns.forEach((column, index, array) => {
                q += `${column.name} ${column.type} ${(column.constraints != undefined)?column.constraints:""}`;
                if (index < array.length - 1) q += ',';
            });

            if (struct.primary_key != undefined) {
                q += `, primary key (${struct.primary_key})`;
            }
            q += ');';

            this.sql.query(q);

            return new Table(this.sql, struct.name, struct);
        }
    }

    module.exports.Database = Database;
})();