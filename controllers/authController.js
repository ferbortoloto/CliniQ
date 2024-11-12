const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const emailService = require("../services/emailService");

const register = async (req, res) => {
    const { name, cpf, email, location, havePlan, plan, cardNumber, date, phone, password } = req.body;

    if (!name || !cpf || !email || !location || !date || !phone || !password) {
        return res.status(422).json({
            success: false,
            msg: "Todos os campos obrigatórios devem ser preenchidos!",
        });
    }

    if (havePlan && (!plan || !cardNumber)) {
        return res.status(422).json({
            success: false,
            msg: "Dados do plano são obrigatórios quando o usuário possui plano!",
        });
    }

    const userExists = await User.findOne({ $or: [{ email: email }, { cpf: cpf }] });
    if (userExists) {
        return res.status(422).json({
            success: false,
            msg: "Email ou CPF já cadastrado! Por favor, utilize outros dados.",
        });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
        name,
        cpf,
        email,
        location,
        havePlan,
        plan: havePlan ? plan : null,
        cardNumber: havePlan ? cardNumber : null,
        date,
        phone,
        password: passwordHash,
    });

    try {
        await user.save();
        res.status(201).json({
            success: true,
            msg: "Usuário criado com sucesso!",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            msg: "Erro no servidor, tente novamente mais tarde.",
        });
    }
};

const login = async (req, res) => {
    const { cpf, password } = req.body;

    if (!cpf || !password) {
        return res.status(422).json({
            success: false,
            msg: "CPF e senha são obrigatórios!",
        });
    }

    const user = await User.findOne({ cpf: cpf });
    if (!user) {
        return res.status(404).json({
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
        return res.status(401).json({
            success: false,
            msg: "Senha inválida!",
        });
    }

    try {
        const secret = process.env.SECRET;
        const token = jwt.sign({ id: user._id }, secret);
        res.status(200).json({
            success: true,
            msg: "Autenticação realizada com sucesso!",
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            msg: "Erro no servidor, tente novamente mais tarde.",
        });
    }
};

const recoverPassword = async (req, res) => {
    const { email, cpf } = req.body;

    if (!email || !cpf) {
        return res.status(422).json({
            success: false,
            msg: "Email e CPF são obrigatórios!",
        });
    }

    const user = await User.findOne({ email: email, cpf: cpf });
    if (!user) {
        return res.status(404).json({
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

    try {
        const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.recoveryCode = recoveryCode;
        user.recoveryCodeExpires = Date.now() + 3600000; // Código válido por 1 hora
        await user.save();

        await emailService.sendEmail(user.email, 'Recuperação de Senha', `Seu código de recuperação é: ${recoveryCode}`);

        res.status(200).json({
            success: true,
            msg: "Código de recuperação enviado para o e-mail fornecido.",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            msg: "Erro ao enviar o e-mail. Tente novamente mais tarde.",
        });
    }
};

const resetPassword = async (req, res) => {
    const { email, cpf, recoveryCode, newPassword, confirmNewPassword } = req.body;

    if (!email || !cpf || !recoveryCode || !newPassword || !confirmNewPassword) {
        return res.status(422).json({
            success: false,
            msg: "Todos os campos são obrigatórios!",
        });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(422).json({
            success: false,
            msg: "As senhas não conferem!",
        });
    }

    const user = await User.findOne({ email: email, cpf: cpf });
    if (!user) {
        return res.status(404).json({
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

    if (user.recoveryCode !== recoveryCode || user.recoveryCodeExpires < Date.now()) {
        return res.status(400).json({
            success: false,
            msg: "Código de recuperação inválido ou expirado!",
        });
    }

    try {
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        user.password = passwordHash;
        user.recoveryCode = undefined;
        user.recoveryCodeExpires = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            msg: "Senha redefinida com sucesso!",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            msg: "Erro no servidor, tente novamente mais tarde.",
        });
    }
};

module.exports = { register, login, recoverPassword, resetPassword };