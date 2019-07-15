const Database = require("sync-mysql-database").Database;
const auth = require("./database_auth.json");
const structure = require("./database_structure.json");
const user_data = require("./DynamicTables/user_data.json");

var database = new Database(auth, structure);

database.createTable(user_data);
let users = database.getTable("users").query();
let names = users.select("username");
let ids = users.select("id");
console.log(ids.where("id > 5").get());
console.log(ids.get());
console.log(names.get());