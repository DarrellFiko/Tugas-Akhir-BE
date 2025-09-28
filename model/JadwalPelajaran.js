const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class JadwalPelajaran extends Model {}

JadwalPelajaran.init(
  {
    id_jadwal: {
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
    hari: {
      type: DataTypes.ENUM(
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu"
      ),
      allowNull: false,
    },
    jam_mulai: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    jam_selesai: {
      type: DataTypes.TIME,
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
  },
  {
    sequelize,
    modelName: "JadwalPelajaran",
    tableName: "jadwal_pelajaran",
    timestamps: false, // kalau mau otomatis pakai Sequelize timestamps ubah jadi true
    name: {
      singular: "JadwalPelajaran",
      plural: "JadwalPelajaran",
    },
  }
);

module.exports = JadwalPelajaran;
