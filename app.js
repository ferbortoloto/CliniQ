require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

const User = require("./models/User")
const Schedule = require('./models/Schedule');
const Doctor = require('./models/Doctor');
const Specialty = require('./models/Specialty');

const app = express()

// Configuracao do JSON
app.use(express.json())


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


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


app.get('/doctors', async (req, res) => {
    try {
      const doctors = await Doctor.find();
      res.status(200).json({
        success: true,
        doctors: doctors,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        msg: 'Erro ao obter os médicos.',
      });
    }
  });


app.get('/doctors/especialidade/:especialidade', async (req, res) => {
    const especialidade = req.params.especialidade;
  
    try {
      const doctors = await Doctor.find({ especialidade: especialidade });
      res.status(200).json({
        success: true,
        doctors: doctors,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        msg: 'Erro ao obter os médicos por especialidade.',
      });
    }
  });
  

app.get('/doctors/specialty/:specialty', async (req, res) => {
    let specialty = req.params.specialty;
  
    try {
      
      specialty = specialty.trim().toLowerCase();

      const regex = new RegExp(`^${specialty}$`, 'i');
  
      const doctors = await Doctor.find({ specialty: regex });
  
      if (doctors.length === 0) {
        return res.status(404).json({
          success: false,
          msg: 'Nenhum médico encontrado para a especialidade fornecida.',
        });
      }
  
      res.status(200).json({
        success: true,
        doctors: doctors,
      });
    } catch (err) {
      console.error('Erro ao obter os médicos por especialidade:', err);
      res.status(500).json({
        success: false,
        msg: 'Erro ao obter os médicos por especialidade.',
      });
    }
  });
  
  
app.get('/specialties', async (req, res) => {
    try {
      const specialties = await Specialty.find();
      res.status(200).json({
        success: true,
        specialties: specialties,
      });
    } catch (err) {
      console.error('Erro ao obter as especialidades:', err);
      res.status(500).json({
        success: false,
        msg: 'Erro ao obter as especialidades.',
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

  
// Rota para obter todas as consultas agendadas
app.get('/schedules', async (req, res) => {
    try {
      const schedules = await Schedule.find();
      res.status(200).json({
        success: true,
        schedules: schedules,
      });
    } catch (err) {
      console.error('Erro ao obter as consultas agendadas:', err);
      res.status(500).json({
        success: false,
        msg: 'Erro ao obter as consultas agendadas.',
      });
    }
  });

  

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


// Rota para enviar notificação manualmente
app.post('/send-notification/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const schedule = await Schedule.findById(id);
      if (!schedule) {
        return res.status(404).json({ msg: 'Agendamento não encontrado.' });
      }
  
      await sendNotification(schedule);
      res.status(200).json({ msg: 'Notificação enviada com sucesso!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Erro ao enviar notificação.' });
    }
  });

  
// Função para enviar e-mail de notificação
async function sendNotification(schedule) {
    try {
      const user = await User.findOne({ cpf: schedule.cpf });
  
      if (!user || !user.email) {
        throw new Error('E-mail do usuário não encontrado.');
      }
  
      const formattedDate = format(
        new Date(schedule.dateConsultation),
        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR }
      );
  
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Lembrete de Consulta',
        text: `Olá, ${user.name}. Você tem uma consulta marcada para ${formattedDate}. Não se esqueça!`,
      });
  
      schedule.notified = true;
      schedule.notificationSentAt = new Date();
      await schedule.save();
  
      console.log(`Notificação enviada para consulta ID: ${schedule._id}`);
    } catch (err) {
      console.error('Erro ao enviar notificação:', err);
      throw err;
    }
  }
  


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

    const user = await User.findOne({ cpf: cpf });

    if (!user) {
        return res.status(404).json({
            statusCode: 404,
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

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

    const user = await User.findOne({ email: email, cpf: cpf });

    if (!user) {
        return res.status(404).json({
            statusCode: 404,
            success: false,
            msg: "Usuário não encontrado!",
        });
    }

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


//Histórico de consultas
function getStartDate(filter) {
    const now = new Date(); 
  
    switch (filter) {
      case '1m':
        return new Date(now.setMonth(now.getMonth() - 1)); 
      case '3m':
        return new Date(now.setMonth(now.getMonth() - 3)); 
      case '6m':
        return new Date(now.setMonth(now.getMonth() - 6)); 
      case '1y':
        return new Date(now.setFullYear(now.getFullYear() - 1)); 
      default:
        return null;
    }
  }
  
  app.get('/history/:cpf', async (req, res) => {
    const { cpf } = req.params;
    const { filter } = req.query; 
  
    try {
      const query = {
        cpf: cpf,
        done: true, 
      };
  
      const startDate = getStartDate(filter);
  
      if (startDate) {
        query.dateConsultation = { $gte: startDate };
      }
  
      const history = await Schedule.find(query).sort({ dateConsultation: -1 });
  
      res.status(200).json({
        success: true,
        history: history,
      });
    } catch (err) {
      console.error('Erro ao obter o histórico de consultas:', err);
      res.status(500).json({
        success: false,
        msg: 'Erro ao obter o histórico de consultas.',
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