const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Ujian extends Model {}

Ujian.init(
  {
    id_ujian: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    id_kelas_tahun_ajaran: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "kelas_tahun_ajaran",
        key: "id_kelas_tahun_ajaran",
      },
    },
    jenis_ujian: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    list_siswa: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "Array of id_user yang diizinkan ikut ujian",
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
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
    modelName: "Ujian",
    tableName: "ujian",
    timestamps: false,
    name: {
      singular: "Ujian",
      plural: "Ujian",
    },
  }
);

module.exports = Ujian;
