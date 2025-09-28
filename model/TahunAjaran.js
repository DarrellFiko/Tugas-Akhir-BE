const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class TahunAjaran extends Model {}

TahunAjaran.init(
  {
    id_tahun_ajaran: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    nama: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    semester: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    is_aktif: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "1 = Aktif, 0 = Tidak Aktif",
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "TahunAjaran",
    tableName: "tahun_ajaran",
    timestamps: false,
    name: {
      singular: "TahunAjaran",
      plural: "TahunAjaran",
    },
  }
);

module.exports = TahunAjaran;
