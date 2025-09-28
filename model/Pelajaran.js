const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Pelajaran extends Model {}

Pelajaran.init(
  {
    id_pelajaran: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    nama_pelajaran: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    kode_pelajaran: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    kelompok: {
      type: DataTypes.STRING(50),
      allowNull: false,
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
    modelName: "Pelajaran",
    tableName: "pelajaran",
    timestamps: false,
    name: {
      singular: "Pelajaran",
      plural: "Pelajaran",
    },
  }
);

module.exports = Pelajaran;
