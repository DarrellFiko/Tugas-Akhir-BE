const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Presensi extends Model {}

Presensi.init(
  {
    id_presensi: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    id_berita_acara: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "berita_acara",
        key: "id_berita_acara",
      },
    },
    id_siswa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id_user",
      },
    },
    status: {
      type: DataTypes.ENUM("Hadir", "Izin", "Sakit", "Alpha"),
      allowNull: false,
      defaultValue: "Alpha",
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
  },
  {
    sequelize,
    modelName: "Presensi",
    tableName: "presensi",
    timestamps: false,
    name: {
      singular: "Presensi",
      plural: "Presensi",
    },
  }
);

module.exports = Presensi;
