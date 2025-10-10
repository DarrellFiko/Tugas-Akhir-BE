const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class BeritaAcara extends Model {}

BeritaAcara.init(
  {
    id_berita_acara: {
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
    judul: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    deskripsi: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tanggal: {
      type: DataTypes.DATEONLY,
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
    modelName: "BeritaAcara",
    tableName: "berita_acara",
    timestamps: false,
    name: {
      singular: "BeritaAcara",
      plural: "BeritaAcara",
    },
  }
);

module.exports = BeritaAcara;