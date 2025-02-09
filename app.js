require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const nodemailer = require('nodemailer');

const User = require("./models/User")
const Schedule = require('./models/Schedule');

const app = express()

// Configuracao do JSON
app.use(express.json())


// Public route
app.get("/", (req, res) => {
    res.status(200).json({
        statusCode: 200,
        success: true,
        msg: "Bem vindo a nossa API!"
    })
})

// Private route (Usuario nao conseguir acessar sem login)
app.get("/user/:id", checkToken, async (req, res) => {
    const id = req.params.id

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            statusCode: 400,
            success: false,
            msg: "ID inválido fornecido."
        })
    }

    // Checando se o usuário está no banco
    const user = await User.findById(id, "-password")

    if (!user) {
        return res.status(404).json({
            statusCode: 404,
            success: false,
            msg: "Usuário não encontrado."
        })
    }

    res.status(200).json({ user })
})

function checkToken(req, res, next) {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
        return res.status(401).json({
            statusCode: 401,
            success: false,
            msg: "Acesso negado!"
        })
    }

    try {
        const secret = process.env.SECRET
        jwt.verify(token, secret)
        next()
    } catch (error) {
        return res.status(400).json({
            statusCode: 400,
            success: false,
            msg: "Token Inválido!"
        })
    }
}


app.post('/schedules', async (req, res) => {
    const {
      cpf,
      location,
      doctor,
      typeConsultation,
      date,
      dateConsultation,
    } = req.body;
  
    if (!cpf || !location || !doctor || !typeConsultation || !date || !dateConsultation) {
      return res.status(422).json({
        success: false,
        msg: 'Todos os campos são obrigatórios!',
      });
    }
  
    try {
      const newSchedule = new Schedule({
        cpf,
        location,
        doctor,
        typeConsultation,
        date,
        dateConsultation,
      });
  
      await newSchedule.save();
  
      res.status(201).json({
        success: true,
        msg: 'Agendamento criado com sucesso!',
        schedule: newSchedule,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        msg: 'Erro ao agendar o horário.',
      });
    }
});

  
app.get('/schedules/:cpf', async (req, res) => {
    const cpf = req.params.cpf;

    try {
        const schedules = await Schedule.find({ cpf: cpf });

        res.status(200).json({
            success: true,
            schedules: schedules,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            msg: 'Erro ao obter os agendamentos.',
        });
    }
});


app.put('/schedules/:id', async (req, res) => {
    const id = req.params.id;
    const { notified, done } = req.body;

    try {
        const schedule = await Schedule.findById(id);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                msg: 'Agendamento não encontrado.',
            });
        }

        if (notified !== undefined) {
            schedule.notified = notified;
        }
        if (done !== undefined) {
            schedule.done = done;
        }

        await schedule.save();

        res.status(200).json({
            success: true,
            msg: 'Agendamento atualizado com sucesso!',
            schedule: schedule,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            msg: 'Erro ao atualizar o agendamento.',
        });
    }
});

  
app.delete('/schedules/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const schedule = await Schedule.findByIdAndDelete(id);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                msg: 'Agendamento não encontrado.',
            });
        }

        res.status(200).json({
            success: true,
            msg: 'Agendamento excluído com sucesso!',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            msg: 'Erro ao excluir o agendamento.',
        });
    }
});
  

app.post("/auth/register", async (req, res) => {
    const {
        name,
        cpf,
        email,
        location,
        havePlan,
        plan,
        cardNumber,
        date,
        phone,
        password
    } = req.body;

    if (!name) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "O nome é obrigatório!",
        });
    }
    if (!cpf) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "CPF é obrigatório!",
        });
    }
    if (!email) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "O email é obrigatório!",
        });
    }
    if (!location) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "Localização é obrigatória!",
        });
    }
    if (havePlan === undefined) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "Indicar se possui plano é obrigatório!",
        });
    }
    if (havePlan) {
        if (!plan) {
            return res.status(422).json({
                statusCode: 422,
                success: false,
                msg: "O nome do plano é obrigatório!",
            });
        }
        if (!cardNumber) {
            return res.status(422).json({
                statusCode: 422,
                success: false,
                msg: "O número do cartão é obrigatório!",
            });
        }
    }
    if (!date) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "Data de nascimento é obrigatória!",
        });
    }
    if (!phone) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "O telefone é obrigatório!",
        });
    }
    if (!password) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "A senha é obrigatória!",
        });
    }

    // Verificar se o usuário já existe (email ou cpf)
    const userExists = await User.findOne({
        $or: [{ email: email }, { cpf: cpf }],
    });

    if (userExists) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "Email ou CPF já cadastrado! Por favor, utilize outros dados.",
        });
    }

    // Criando hash da senha
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Cria usuário
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

        res.status(200).json({
            statusCode: 200,
            success: true,
            msg: "Usuário criado com sucesso!",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            statusCode: 500,
            success: false,
            msg: "Aconteceu um erro no servidor, tente novamente mais tarde",
        });
    }
});

app.post("/auth/login", async (req, res) => {
    const { cpf, password } = req.body;

    if (!cpf) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "O CPF é obrigatório!",
        });
    }
    if (!password) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "A senha é obrigatória!",
        });
    }

    // Verificar se o usuário existe pelo CPF
    const user = await User.findOne({ cpf: cpf });

    if (!user) {
        return res.status(404).json({
            statusCode: 404,
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

    // Verificar a senha
    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
        return res.status(401).json({
            statusCode: 401,
            success: false,
            msg: "Senha inválida!",
        });
    }

    try {
        const secret = process.env.SECRET;

        const token = jwt.sign(
            {
                id: user._id,
            },
            secret
        );

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: {
                msg: "Autenticação realizada com sucesso!",
                token,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            statusCode: 500,
            success: false,
            msg: "Erro no servidor, tente novamente mais tarde.",
        });
    }
});


app.post("/auth/recovery", async (req, res) => {
    const { email, cpf } = req.body;

    if (!email) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "O email é obrigatório!",
        });
    }
    if (!cpf) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "O CPF é obrigatório!",
        });
    }

    // Verificar se o usuário existe
    const user = await User.findOne({ email: email, cpf: cpf });

    if (!user) {
        return res.status(404).json({
            statusCode: 404,
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

    try {
        // Gerando um código aleatório
        const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

        user.recoveryCode = recoveryCode;
        user.recoveryCodeExpires = Date.now() + 3600000; // Código válido por 1 hora
        await user.save();

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Recuperação de Senha',
            text: `Seu código de recuperação é: ${recoveryCode}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            statusCode: 200,
            success: true,
            msg: "Código de recuperação enviado para o e-mail fornecido.",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            statusCode: 500,
            success: false,
            msg: "Erro ao enviar o e-mail. Tente novamente mais tarde.",
        });
    }
});


app.post("/auth/reset-password", async (req, res) => {
    const { email, cpf, recoveryCode, newPassword, confirmNewPassword } = req.body;

    if (!email || !cpf || !recoveryCode || !newPassword || !confirmNewPassword) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "Todos os campos são obrigatórios!",
        });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(422).json({
            statusCode: 422,
            success: false,
            msg: "As senhas não conferem!",
        });
    }

    // Verificar se o usuário existe
    const user = await User.findOne({ email: email, cpf: cpf });

    if (!user) {
        return res.status(404).json({
            statusCode: 404,
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

    // Verificar o código de recuperação
    if (
        user.recoveryCode !== recoveryCode ||
        user.recoveryCodeExpires < Date.now()
    ) {
        return res.status(400).json({
            statusCode: 400,
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
            statusCode: 200,
            success: true,
            msg: "Senha redefinida com sucesso!",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            statusCode: 500,
            success: false,
            msg: "Erro no servidor, tente novamente mais tarde.",
        });
    }
});


//Credenciais
const db = process.env.DB

mongoose
    .connect(db)
    .then(() => {
        app.listen(3000)
        console.log("Conectou ao Banco!")
    })
    .catch((err) => console.log(err))