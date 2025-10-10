const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Materi extends Model {}

Materi.init(
  {
    id_materi: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pertemuan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deskripsi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    id_kelas_tahun_ajaran: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "kelas_tahun_ajaran",
        key: "id_kelas_tahun_ajaran",
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
    modelName: "Materi",
    tableName: "materi",
    timestamps: false,
    name: {
      singular: "Materi",
      plural: "Materi",
    },
  }
);

module.exports = Materi;
