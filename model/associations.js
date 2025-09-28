const Kategori = require("./Kategori");
const Barang = require("./barang.js");
const Toko = require("./Toko");
const TokoBarang = require("./TokoBarang");


// Relationship
// 1. Relasi one to one, menggunakan syntax hasOne dan belongsTo
// 2. Relasi one to many, menggunakan syntax hasMany dan belongsTo
// 3. Relasi many to many, menggunakan syntax belongsToMany

// 1. One to one relationship
// Contoh: 1 Mahasiswa hanya bisa mempunyai 1 Judul TA, 1 judul TA hanya bisa dimiliki 1 Mahasiswa.
// JudulTA.hasOne(Mahasiswa);
// Mahasiswa.belongsTo(JudulTA);

//- belongsTo diberikan pada tabel yang menyimpan foreign key dari tabel lainnya. Dalam contoh ini tabel mahasiswa yang menyimpan foreign key dari tabel judulTA.
//- hasOne diberikan pada tabel yang primary keynya disimpan sebagai foreign key di tabel lain. Dalam contoh ini tabel judulTA yang primary keynya menjadi foreign key pada tabel mahasiswa.

module.exports = function(){
    
  // 2. One to many relationship
  // Contoh: 1 Barang hanya bisa memiliki 1 kategori tetapi 1 kategori bisa dimiliki banyak barang
  Kategori.hasMany(Barang, {foreignKey: "id_kategori"});
  Barang.belongsTo(Kategori, {foreignKey: "id_kategori"});
  //atribut foreign key untuk memperjelas foreign key yang ada pada relasi

  // 3. Many to many relationship
  // Contoh: 1 Toko bisa memiliki banyak jenis barang, 1 jenis barang bisa dimiliki oleh banyak toko
  Toko.belongsToMany(Barang, {through: TokoBarang, foreignKey: "id_toko"});
  Barang.belongsToMany(Toko, {through: TokoBarang, foreignKey: "id_barang"});

  //Atribut through diisi dengan nama model yang menjadi tabel bantuan yang menyimpan primary key dari kedua tabel 
}