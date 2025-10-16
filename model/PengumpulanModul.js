const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class PengumpulanModul extends Model {}

PengumpulanModul.init(
  {
    id_pengumpulan_modul: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    id_modul: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "modul",
        key: "id_modul",
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
    file_pengumpulan: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: "PengumpulanModul",
    tableName: "pengumpulan_modul",
    timestamps: false,
    name: {
      singular: "PengumpulanModul",
      plural: "PengumpulanModul",
    },
  }
);

module.exports = PengumpulanModul;
