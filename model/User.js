const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class User extends Model {}

User.init(
  {
    id_user: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    nama: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    nis: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    nisn: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    gender: {
      type: DataTypes.TINYINT,
      allowNull: true,
      comment: "0 = Laki-laki, 1 = Perempuan",
    },
    tgl_lahir: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    tempat_lahir: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    agama: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    alamat: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nama_ayah: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    nama_ibu: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    telp: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    telp_ortu: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: "1 = Aktif, 0 = Tidak Aktif",
    },
    profile_picture: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    otp_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: false,
    name: {
      singular: "User",
      plural: "Users",
    },
  }
);

module.exports = User;
