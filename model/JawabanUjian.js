const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class JawabanUjian extends Model {}

JawabanUjian.init(
  {
    id_jawaban: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    id_soal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "soal",
        key: "id_soal",
      },
      onDelete: "CASCADE",
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id_user",
      },
      onDelete: "CASCADE",
    },
    jawaban: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    keterangan: {
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
    modelName: "JawabanUjian",
    tableName: "jawaban_ujian",
    timestamps: false,
    name: {
      singular: "JawabanUjian",
      plural: "JawabanUjian",
    },
  }
);

module.exports = JawabanUjian;
