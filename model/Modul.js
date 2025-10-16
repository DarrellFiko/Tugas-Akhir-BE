const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Modul extends Model {}

Modul.init(
  {
    id_modul: {
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
    nama_modul: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    jenis_modul: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tipe_file_modul: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sifat_pengumpulan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status_modul: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    id_created_by: {
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
    modelName: "Modul",
    tableName: "modul",
    timestamps: false,
    name: {
      singular: "Modul",
      plural: "Modul",
    },
  }
);

module.exports = Modul;
