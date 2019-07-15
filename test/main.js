const Database = require("sync-mysql-database").Database;
const auth = require("./database_auth.json");
const structure = require("./database_structure.json");
const user_data = require("./DynamicTables/user_data.json");

var database = new Database(auth, structure);

database.createTable(user_data);
console.log(database.getTable("user_data").query().get());