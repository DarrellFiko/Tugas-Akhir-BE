const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Pengumuman extends Model {}

Pengumuman.init(
  {
    id_pengumuman: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    judul: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    isi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_by: {
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
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id_user",
      },
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
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    id_kelas_tahun_ajaran: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "kelas_tahun_ajaran",
        key: "id_kelas_tahun_ajaran",
      },
    },
  },
  {
    sequelize,
    modelName: "Pengumuman",
    tableName: "pengumuman",
    timestamps: false,
  }
);

module.exports = Pengumuman;
