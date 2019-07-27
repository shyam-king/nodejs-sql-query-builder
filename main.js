(function () {
    const mysql = require("sync-mysql");

    //classes to handle access to database
    class Query {
        constructor (sql, table_name) {
            this.query = ";";
            this.selection = '*';
            this.sql = sql;
            this.table = table_name;
            this.Distinct = false;
        }

        select(... selection) {
            let q = this.getQuery();
            if (selection == undefined) {
                q = q.selectAll();
            } 
            q.selection = selection.join(",");
            
            return q;
        }

        where(where_clause) {
            let q = this.getQuery();
            if (q.where_clause)
                q.where_clause = `(${q.where_clause}) AND ${where_clause}`;
            else
                q.where_clause = where_clause;
            return q;
        }

        orderby(col, order) {
            if (order == undefined) {
                order = "asc";
            }

            let q = this.getQuery();
            if (q.order == undefined) {
                q.order = "";
            }
            else {
                q.order+= ", ";
            }

            q.order += `${col} ${order}`;
            return q;
        }

        selectAll() {
            let q = this.getQuery();
            q.selection = "*";
            return q;
        }

        limit(offset, count) {
            let q = this.getQuery();
            q.limitClause = ` LIMIT ${offset}, ${count}`;
            return q;
        }

        get() {
            this.query = `SELECT ${(this.Distinct?"DISTINCT": "")} ${this.selection} FROM ${this.table}`;
            if (this.where_clause) {
                this.query += ` WHERE ${this.where_clause}`;
            }
            if (this.order) {
                this.query += ` ORDER BY ${this.order}`;
            }
            if (this.limitClause) {
                this.query += this.limitClause;
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

        update (... vals) {
            this.query = `UPDATE ${this.table} SET `

            if (vals == undefined || vals.length < 1) {
                throw "update() requires at least one value"
            }

            if (this.selection == "*") {
                throw "update() cannot work without select()"
            }

            let selections = this.selection.split(",");
            let set_clause = undefined;

            if (selections.length < vals.length) {
                throw "missing certain values";
            }

            vals.forEach((element, i) => {
                if (typeof(element) == "string")
                    element = `"${element}"`;

                if (set_clause == undefined) {
                    set_clause = "";
                }
                else {
                    set_clause += ", "
                }

                set_clause += `${selections[i]} = ${element}`;
            });

            this.query += set_clause;

            if (this.where_clause) 
                this.query += ` WHERE ${this.where_clause}`;

            this.query += ";";
            return this.sql.query(this.query);
        }

        getValue() {
            let value = this.get();
            if (value.length == 0)
                return undefined;
                
            let v = Object.values(value[0])[0];
            return v;
        }

        getQuery() {
            return Object.create(this);
        }

        distinct() {
            this.Distinct = true;
            return Object.create(this);
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
                if (struct.preupdate_queries) {
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
                this.createTable(element);
            });
        };
    
        deleteTables() {
            let q = 'DROP TABLE IF EXISTS <tablename>;';
            this.struct.tables.forEach((element)=>{
                this.sql.query(q.replace("<tablename>", element.name));
            });
        }

        createTable(struct) {
            this.struct.tables.push(struct);
            let q = `CREATE TABLE IF NOT EXISTS ${struct.name} (`;
            struct.columns.forEach((column, index, array) => {
                q += `${column.name} ${column.type} ${(column.constraints != undefined)?column.constraints:""}`;
                if (index < array.length - 1) q += ',';
            });

            if (struct.primary_key != undefined) {
                q += `, primary key (${struct.primary_key})`;
            }
            
            if (struct.constraints != undefined) {
                if (struct.constraints.Array)
                    q += ", " + struct.constraints.join(", ");
                else 
                    q += ", " + struct.constraints;
            } 
            
            q += ');';

        
            this.sql.query(q);

            return new Table(this.sql, struct.name, struct);
        }

        createNewTable(struct) {
            let q = "DROP TABLE IF EXISTS " + struct.name + ";";
            this.sql.query(q);

            this.updateStruct(struct);

            return this.createTable(struct);
        }

        updateStruct(struct) {
            let found = false;
            this.struct.tables.forEach((element, index, array)=>{
                if (element.name == struct.name) {
                    array[index] = struct;
                    found = true;
                }
            });

            if (!found) {
                this.struct.tables.push(struct);
            }
        }

        updateDatabase() {
            let tables = this.sql.query("SHOW TABLES;");
            tables.forEach((t)=>{
                let element = Object.values(t)[0];
                if (element != "metadata")
                {
                    let tableDatabaseStructure = this.sql.query(`DESCRIBE ${element};`);
                    let struct = {};
                    struct.name = element;
                    struct.columns = [];
                    tableDatabaseStructure.forEach(col => {
                        let ccol = {};
                        ccol.name = col.Field;
                        ccol.type = col.Type;
                        if (col.Key.search(/PRI/) >= 0) {
                            if (struct.primary_key) {
                                struct.primary_key += `, ${col.name}`;
                            }
                            else 
                                struct.primary_key = col.name;
                        }
                        struct.columns.push(ccol);
                    });
                    this.updateStruct(struct);
                }
            });
        }
    }

    module.exports.Database = Database;
})();