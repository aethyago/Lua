// ============================
// Daily RP's
// ============================
//
// Este comando implementa um sistema de recompensas diárias (daily) para a bot Lua. 
// O objetivo é oferecer aos usuários uma recompensa de RP's (moedas da bot) que varia
// entre 100 e 600 RP's por vez. O sistema inclui uma verificação para garantir que o
// usuário seja realmente "humano" através de uma pergunta interativa.
//
// Funcionamento do sistema:
// 1. Quando um usuário executa o comando, o sistema ativa uma verificação de segurança
//    que apresenta uma pergunta ao usuário com botões interativos de "Sim" ou "Não".
// 2. Se o usuário clicar em "Sim" e responder corretamente à pergunta, ele recebe um
//    bônus adicional de 100 RP's, além da recompensa diária.
// 3. Se o usuário clicar em "Não" ou responder incorretamente à pergunta, ele recebe
//    apenas a recompensa diária, que varia entre 100 e 600 RP's, sem o bônus extra.
//
// Requisitos:
// - O comando requer o MongoDB para armazenar e gerenciar as informações dos usuários.
// - É necessário ter um esquema (schema) já configurado no MongoDB para gerenciar as
//   informações de RP's e o status de verificação dos usuários.
//
//A implementação inclui:
// - Geração de RP's aleatórios
// - Sistema de perguntas e respostas interativas com botões de "Sim" e "Não" para verificação
// - Bônus adicional em caso de resposta correta
//
// Certifique-se de que o comando esteja corretamente registrado e que o sistema de
// verificação com botões interativos funcione conforme o esperado para oferecer uma
// experiência justa e divertida para os usuários.
// 
// Desenvolvido por: ae.thyago
// ===========================================================


const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const User = require('Aqui coloque o local da sua Schema MongoDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Colete seus RP\'s diários.'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const currentTime = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const targetTime = Math.floor((Date.now() + 30000) / 1000);

        const questions = [ //Fique à vontade para escrever suas próprias perguntas.
            { question: `Vender coisas reais por RP da ban permanentemente na Lua?\n\nResponda até: <t:${targetTime}:R>`, correctAnswer: "sim" },
            { question: `**RP's** são exclusivamente para uso dentro da Lua?\n\nResponda até: <t:${targetTime}:R>`, correctAnswer: "sim" },
            { question: `Xingar a Lua resulta em banimento permanentemente?\n\nResponda até: <t:${targetTime}:R>`, correctAnswer: "sim" }
        ];

        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

        try {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId, rps: 0, lastClaim: 0 });
            }

            if (!user.lastClaim || currentTime - user.lastClaim >= oneDay) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('answer_sim')
                            .setLabel('Sim')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('answer_nao')
                            .setLabel('Não')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.reply({ content: `${randomQuestion.question}`, components: [row] });

                const filter = i => i.user.id === userId && (i.customId === 'answer_sim' || i.customId === 'answer_nao');
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

                collector.on('collect', async i => {
                    await i.deferUpdate();

                    let dailyRP = Math.floor(Math.random() * (600 - 100 + 1)) + 100;
                    const userAnswer = i.customId === 'answer_sim' ? 'sim' : 'não';
                    let bonusText = '';

                    if (userAnswer === randomQuestion.correctAnswer) {
                        dailyRP += 100;
                        bonusText = '\nVocê acertou a pergunta e ganhou um bônus de <:RP:1264604697453662349> **100 RP\'s**!';
                    } else {
                        bonusText = '\nVocê errou a pergunta, mas ainda recebeu seus **RP\'s** diários.';
                    }

                    user.rps += dailyRP;
                    user.lastClaim = currentTime;
                    await user.save();

                    const embedDaily = new EmbedBuilder()
                        .setColor('#7950f2')
                        .setTitle(`RP's | DAILY`)
                        .setDescription(`Você recebeu <:RP:1264604697453662349> **${dailyRP} RP's**! Agora você possui <:RP:1264604697453662349> **${user.rps} RP's**.\n${bonusText}`)
                        .setFooter({ text: `Volte novamente amanhã!`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();

                    await i.editReply({ content: ``, embeds: [embedDaily], components: [] });
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        const dailyRP = Math.floor(Math.random() * (600 - 100 + 1)) + 100;
                        user.rps += dailyRP;
                        user.lastClaim = currentTime;
                        await user.save();

                        const embedDaily = new EmbedBuilder()
                            .setColor('#7950f2')
                            .setTitle(`RP's | DAILY`)
                            .setDescription(`Você não respondeu a tempo, mas ainda assim, recebeu <:RP:1264604697453662349> **${dailyRP} RP's**! Agora você possui <:RP:1264604697453662349> **${user.rps} RP's**.`)
                            .setFooter({ text: `Volte novamente amanhã!`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embedDaily], components: [] });
                    }
                });

            } else {
                const timeLeft = oneDay - (currentTime - user.lastClaim);
                const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                const embed = new EmbedBuilder()
                    .setColor('#7950f2')
                    .setTitle(`RP's | DAILY`)
                    .setDescription(`Você já reivindicou seus <:RP:1264604697453662349> **RP's** hoje.`)
                    .setFooter({ text: `Volte em: ${hours} horas e ${minutes} minutos.`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();

                interaction.reply({ content: ``, embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply(`Ocorreu um erro ao tentar reivindicar seus RP's\n\`\`\`js\n${error}\n\`\`\``);
        }
    }
};
