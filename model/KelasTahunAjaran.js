const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class KelasTahunAjaran extends Model {}

KelasTahunAjaran.init(
  {
    id_kelas_tahun_ajaran: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    id_tahun_ajaran: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tahun_ajaran",
        key: "id_tahun_ajaran",
      },
    },
    id_kelas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "kelas",
        key: "id_kelas",
      },
    },
    id_pelajaran: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "pelajaran",
        key: "id_pelajaran",
      },
    },
    guru_pengampu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
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
    modelName: "KelasTahunAjaran",
    tableName: "kelas_tahun_ajaran",
    timestamps: false,
    name: {
      singular: "KelasTahunAjaran",
      plural: "KelasTahunAjaran",
    },
  }
);

module.exports = KelasTahunAjaran;
