const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Soal extends Model {}

Soal.init(
  {
    id_soal: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    id_ujian: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ujian",
        key: "id_ujian",
      },
    },
    jenis_soal: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    text_soal: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    list_jawaban: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    jawaban_benar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gambar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
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
    modelName: "Soal",
    tableName: "soal",
    timestamps: false,
    name: {
      singular: "Soal",
      plural: "Soal",
    },
  }
);

module.exports = Soal;
