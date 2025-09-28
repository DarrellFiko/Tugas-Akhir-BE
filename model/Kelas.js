const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Kelas extends Model {}

Kelas.init(
  {
    id_kelas: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    nama_kelas: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tingkat: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    jurusan: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    wali_kelas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users", // relasi ke tabel users
        key: "id_user",
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Kelas",
    tableName: "kelas",
    timestamps: false,
    name: {
      singular: "Kelas",
      plural: "Kelas",
    },
  }
);

module.exports = Kelas;
