/**
 * CONTEÚDO DE DEMONSTRAÇÃO.
 * Todo item aqui é gravado com is_demo = true e exibido com o selo
 * "Demonstração". Deve ser revisado ou removido pelo proprietário antes do lançamento.
 * Os passos são propositalmente genéricos: menus variam conforme marca e versão do Android.
 */

export const categories = [
  { slug: "primeiros-passos", name: "Primeiros passos no Android", icon: "smartphone", description: "Ligar, desligar, botões, tela e o básico para começar sem medo." },
  { slug: "whatsapp", name: "WhatsApp", icon: "message-circle", description: "Mensagens, áudios, fotos, chamadas e segurança no WhatsApp." },
  { slug: "instagram", name: "Instagram", icon: "camera", description: "Ver publicações, seguir pessoas e cuidar da privacidade." },
  { slug: "facebook", name: "Facebook", icon: "users", description: "Reencontrar amigos, grupos e configurações de privacidade." },
  { slug: "youtube", name: "YouTube", icon: "play-circle", description: "Encontrar vídeos, legendas e salvar para assistir depois." },
  { slug: "seguranca", name: "Segurança digital", icon: "shield-check", description: "Golpes, senhas, links falsos e como se proteger." },
  { slug: "fotos-e-videos", name: "Fotos e vídeos", icon: "image", description: "Tirar, organizar, enviar e guardar suas fotos." },
  { slug: "configuracoes", name: "Configurações do celular", icon: "settings", description: "Letras maiores, volume, bateria, espaço e ajustes úteis." },
  { slug: "internet", name: "Internet e Wi-Fi", icon: "wifi", description: "Conectar no Wi-Fi, dados móveis e quando a internet não funciona." },
  { slug: "aplicativos", name: "Aplicativos úteis", icon: "layout-grid", description: "Instalar, atualizar e usar bem os aplicativos do dia a dia." },
];

export const synonyms: [string, string[]][] = [
  ["zap", ["whatsapp"]],
  ["zapzap", ["whatsapp"]],
  ["wpp", ["whatsapp"]],
  ["whats", ["whatsapp"]],
  ["uatsap", ["whatsapp"]],
  ["insta", ["instagram"]],
  ["face", ["facebook"]],
  ["yt", ["youtube"]],
  ["mudo", ["som", "silencioso", "notificacao"]],
  ["toca", ["som", "notificacao", "toque"]],
  ["barulho", ["som", "notificacao"]],
  ["silencioso", ["som", "nao perturbe"]],
  ["lento", ["devagar", "travando", "lentidao"]],
  ["travando", ["lento", "travado"]],
  ["devagar", ["lento"]],
  ["espaco", ["armazenamento", "memoria", "cheio"]],
  ["memoria", ["armazenamento", "espaco"]],
  ["cheio", ["armazenamento", "espaco"]],
  ["letra", ["fonte", "texto", "tamanho"]],
  ["letras", ["fonte", "texto", "tamanho"]],
  ["fonte", ["letra", "tamanho"]],
  ["golpe", ["fraude", "seguranca", "falso"]],
  ["fraude", ["golpe"]],
  ["clonado", ["golpe", "seguranca", "whatsapp"]],
  ["pirata", ["golpe"]],
  ["senha", ["recuperar", "acesso"]],
  ["esqueci", ["senha", "recuperar"]],
  ["wifi", ["internet", "conexao"]],
  ["wi-fi", ["internet", "wifi"]],
  ["net", ["internet"]],
  ["dados", ["internet", "dados moveis"]],
  ["foto", ["imagem", "fotos"]],
  ["fotos", ["foto", "imagem"]],
  ["imagem", ["foto"]],
  ["print", ["captura", "tela"]],
  ["bateria", ["carga", "energia"]],
];

export type GuideSeed = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  app?: string;
  access: "free" | "premium";
  phrases: string[];
  causes: string[];
  steps: string[];
  cautions: string[];
  ifNotWorking: string;
};

const MENUS_VARIAM =
  "Os nomes dos menus mudam conforme a marca e a versão do celular (Samsung, Motorola, Xiaomi e outras). Se não encontrar exatamente o mesmo nome, procure um parecido.";

export const guides: GuideSeed[] = [
  {
    slug: "whatsapp-nao-toca",
    title: "Meu WhatsApp não toca quando chega mensagem",
    summary: "As mensagens chegam, mas o celular não faz barulho. Veja o que conferir, do mais simples ao mais completo.",
    category: "whatsapp",
    app: "WhatsApp",
    access: "free",
    phrases: ["whatsapp não toca", "zap sem som", "whatsapp mudo", "notificação sem som", "não ouço a mensagem chegar"],
    causes: [
      "O celular pode estar no modo silencioso ou no \"Não perturbe\".",
      "As notificações do WhatsApp podem ter sido desativadas.",
      "A economia de bateria pode estar impedindo o WhatsApp de avisar.",
      "O volume de notificações pode estar no mínimo.",
    ],
    steps: [
      "Aperte o botão de aumentar volume na lateral do celular. Na tela, confira se o celular não está no silencioso ou só vibrando.",
      "Deslize o dedo de cima para baixo na tela. Procure o botão \"Não perturbe\". Se ele estiver destacado (aceso), toque nele para desligar.",
      "Abra o WhatsApp. Toque nos três pontinhos no canto de cima e depois em \"Configurações\" e \"Notificações\". Confira se o som de notificação está ativado.",
      "Abra as Configurações do celular, toque em \"Aplicativos\", depois em \"WhatsApp\" e em \"Notificações\". Verifique se as notificações estão permitidas.",
      "Ainda em \"Aplicativos\" > \"WhatsApp\", procure \"Bateria\" e escolha a opção sem restrições.",
      "Peça para alguém enviar uma mensagem de teste para você.",
    ],
    cautions: [MENUS_VARIAM, "Ninguém da Onzetec vai pedir códigos ou senhas do seu WhatsApp."],
    ifNotWorking: "Desligue e ligue o celular novamente. Depois, abra a Play Store, procure por WhatsApp e toque em \"Atualizar\", se aparecer.",
  },
  {
    slug: "como-saber-se-mensagem-e-golpe",
    title: "Como saber se uma mensagem é golpe",
    summary: "Sinais de alerta em mensagens, ligações e links — e o que fazer antes de responder.",
    category: "seguranca",
    access: "free",
    phrases: ["mensagem golpe", "é golpe", "whatsapp clonado", "pedido de pix", "link falso", "mensagem suspeita"],
    causes: [
      "Golpistas fingem ser parentes, bancos ou lojas para pedir dinheiro ou códigos.",
      "Mensagens com urgência (\"é agora\", \"sua conta será bloqueada\") são um sinal de alerta.",
    ],
    steps: [
      "Pare e não responda na hora. Golpes dependem de pressa.",
      "Desconfie de pedidos de dinheiro, Pix ou de \"código que chegou por SMS\". Nunca envie esse código para ninguém.",
      "Se a mensagem diz ser de um parente com número novo, ligue para o número antigo que você já conhece e confirme.",
      "Não toque em links recebidos de desconhecidos. Para falar com o banco, use o aplicativo oficial ou o telefone do cartão.",
      "Se for golpe, toque e segure na conversa e escolha \"Denunciar\" e \"Bloquear\".",
    ],
    cautions: [
      "Bancos não pedem senha, código ou transferência por mensagem.",
      "Se você já enviou dinheiro, procure o banco imediatamente e registre um boletim de ocorrência.",
    ],
    ifNotWorking: "Na dúvida, mostre a mensagem para uma pessoa de confiança antes de fazer qualquer coisa.",
  },
  {
    slug: "aumentar-tamanho-das-letras",
    title: "Como aumentar as letras do celular",
    summary: "Deixe tudo mais fácil de ler aumentando o tamanho do texto e, se quiser, dos ícones.",
    category: "configuracoes",
    app: "Android",
    access: "free",
    phrases: ["aumentar letra", "letra pequena", "não enxergo a tela", "fonte maior", "tela maior"],
    causes: ["O tamanho padrão do texto costuma ser pequeno para leitura confortável."],
    steps: [
      "Abra as Configurações do celular (ícone de engrenagem).",
      "Toque em \"Tela\" ou \"Visor\". Em alguns celulares, a opção fica em \"Acessibilidade\".",
      "Procure \"Tamanho da fonte\" ou \"Tamanho do texto\".",
      "Arraste o controle para a direita até as letras ficarem confortáveis. Veja o exemplo na própria tela.",
      "Se quiser aumentar também ícones e botões, procure \"Tamanho da exibição\" ou \"Zoom da tela\".",
    ],
    cautions: [MENUS_VARIAM],
    ifNotWorking: "Use a lupa das Configurações e digite \"fonte\" para encontrar a opção mais rápido.",
  },
  {
    slug: "celular-sem-espaco",
    title: "O celular está sem espaço",
    summary: "Aparece \"armazenamento cheio\"? Veja como liberar espaço sem perder o que é importante.",
    category: "configuracoes",
    app: "Android",
    access: "free",
    phrases: ["celular sem espaço", "memória cheia", "armazenamento cheio", "não cabe mais nada", "liberar espaço"],
    causes: [
      "Fotos e vídeos recebidos pelo WhatsApp ocupam muito espaço.",
      "Aplicativos que você não usa continuam ocupando memória.",
    ],
    steps: [
      "Abra as Configurações e toque em \"Armazenamento\" para ver o que ocupa mais espaço.",
      "No WhatsApp, vá em \"Configurações\" > \"Armazenamento e dados\" > \"Gerenciar armazenamento\" e apague vídeos grandes que não precisa mais.",
      "Desinstale aplicativos que você não usa: toque e segure o ícone e escolha \"Desinstalar\".",
      "Antes de apagar fotos, confirme se elas estão guardadas em um backup (por exemplo, no Google Fotos).",
    ],
    cautions: ["Apagar é definitivo. Confira duas vezes antes de excluir fotos de família.", MENUS_VARIAM],
    ifNotWorking: "Considere usar um cartão de memória, se o seu celular tiver espaço para ele.",
  },
  {
    slug: "celular-lento",
    title: "Meu celular está lento",
    summary: "Passos simples para deixar o celular mais rápido no dia a dia.",
    category: "configuracoes",
    app: "Android",
    access: "premium",
    phrases: ["celular lento", "celular travando", "celular devagar", "demora para abrir"],
    causes: ["Pouco espaço livre.", "Muitos aplicativos abertos ao mesmo tempo.", "Sistema ou aplicativos desatualizados."],
    steps: [
      "Reinicie o celular: segure o botão de ligar e toque em \"Reiniciar\".",
      "Libere espaço (veja o guia \"O celular está sem espaço\").",
      "Abra a Play Store, toque na sua foto de perfil e em \"Gerenciar apps e dispositivo\" para atualizar os aplicativos.",
      "Em Configurações, procure \"Atualização de software\" ou \"Sistema\" e verifique se há atualização.",
    ],
    cautions: ["Faça atualizações conectado ao Wi-Fi e com bateria acima de 50%.", MENUS_VARIAM],
    ifNotWorking: "Se o celular continuar muito lento, procure uma assistência técnica autorizada da marca.",
  },
  {
    slug: "internet-nao-funciona",
    title: "Minha internet não funciona",
    summary: "Descubra se o problema é no Wi-Fi, nos dados móveis ou no próprio celular.",
    category: "internet",
    access: "premium",
    phrases: ["internet não funciona", "wifi não conecta", "sem internet", "dados móveis não funcionam", "net caiu"],
    causes: ["Modo avião ligado.", "Wi-Fi desconectado ou com a senha errada.", "Dados móveis desligados ou pacote de internet terminou."],
    steps: [
      "Deslize o dedo de cima para baixo na tela e confira se o \"Modo avião\" está desligado.",
      "No mesmo painel, veja se o Wi-Fi está ligado e conectado à sua rede.",
      "Se estiver fora de casa, verifique se os \"Dados móveis\" estão ligados.",
      "Desligue o roteador da tomada, espere 30 segundos e ligue novamente.",
      "Abra um site ou vídeo para testar.",
    ],
    cautions: [MENUS_VARIAM],
    ifNotWorking: "Teste outro aparelho na mesma rede. Se nenhum funcionar, entre em contato com a sua operadora de internet.",
  },
  {
    slug: "nao-consigo-enviar-foto-whatsapp",
    title: "Não consigo mandar uma foto no WhatsApp",
    summary: "O passo a passo para enviar fotos e o que verificar quando não funciona.",
    category: "whatsapp",
    app: "WhatsApp",
    access: "premium",
    phrases: ["não consigo mandar foto", "enviar foto zap", "foto não vai", "mandar imagem whatsapp"],
    causes: ["O WhatsApp pode estar sem permissão para acessar as fotos.", "A internet pode estar fraca."],
    steps: [
      "Abra a conversa com a pessoa.",
      "Toque no ícone de clipe (📎) ou no sinal de mais (+), ao lado do campo de mensagem.",
      "Escolha \"Galeria\", toque na foto e depois no botão de enviar (seta verde).",
      "Se o WhatsApp pedir permissão para acessar as fotos, toque em \"Permitir\".",
    ],
    cautions: [MENUS_VARIAM],
    ifNotWorking: "Em Configurações > Aplicativos > WhatsApp > Permissões, permita o acesso a \"Fotos e vídeos\".",
  },
  {
    slug: "esqueci-minha-senha",
    title: "Esqueci minha senha",
    summary: "Como recuperar o acesso a uma conta com segurança, sem cair em golpes.",
    category: "seguranca",
    access: "premium",
    phrases: ["esqueci minha senha", "recuperar senha", "não lembro a senha", "perdi a senha"],
    causes: ["Senhas esquecidas são comuns. Todo serviço sério tem uma forma oficial de recuperar o acesso."],
    steps: [
      "Na tela de entrada do aplicativo, toque em \"Esqueci minha senha\".",
      "Informe o e-mail ou telefone cadastrado.",
      "Você receberá um código ou link. Use-o apenas no próprio aplicativo ou site — nunca envie para outra pessoa.",
      "Crie uma senha nova e anote em um lugar seguro, longe do celular.",
    ],
    cautions: ["Ninguém precisa do seu código de recuperação. Quem pede, é golpe."],
    ifNotWorking: "Procure a página oficial de ajuda do serviço. Nunca use \"técnicos\" encontrados em anúncios ou comentários.",
  },
];

export type LessonSeed = { slug: string; title: string; summary: string; access: "free" | "premium"; transcript: string };
export type CourseSeed = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  app?: string;
  modules: { title: string; lessons: LessonSeed[] }[];
};

const T = (t: string) => `Transcrição de demonstração. ${t}`;

export const courses: CourseSeed[] = [
  {
    slug: "primeiros-passos-no-android",
    title: "Primeiros passos no Android",
    summary: "Conheça o seu celular com calma: botões, tela, letras e sons.",
    description:
      "Um curso para quem está começando ou quer perder o medo do celular. Cada aula é curta e mostra um passo de cada vez.",
    category: "primeiros-passos",
    app: "Android",
    modules: [
      {
        title: "Conhecendo o seu celular",
        lessons: [
          { slug: "ligar-desligar-e-reiniciar", title: "Ligar, desligar e reiniciar", summary: "Os botões laterais e quando reiniciar o celular.", access: "free", transcript: T("Nesta aula você aprende a ligar, desligar e reiniciar o celular.") },
          { slug: "botoes-e-gestos-da-tela", title: "Os botões e gestos da tela", summary: "Tocar, segurar, arrastar e voltar.", access: "premium", transcript: T("Vamos conhecer os toques e gestos da tela.") },
        ],
      },
      {
        title: "Deixando o celular do seu jeito",
        lessons: [
          { slug: "letras-maiores-e-tela", title: "Letras maiores e tela mais confortável", summary: "Ajuste o tamanho do texto e o brilho.", access: "premium", transcript: T("Vamos ajustar o tamanho das letras.") },
          { slug: "volume-e-toques", title: "Volume e toques", summary: "Controle o volume de chamadas, mensagens e mídia.", access: "premium", transcript: T("Vamos ajustar os volumes do celular.") },
        ],
      },
    ],
  },
  {
    slug: "whatsapp-sem-complicacao",
    title: "WhatsApp sem complicação",
    summary: "Mensagens, áudios, fotos e segurança — do básico ao essencial.",
    description: "Aprenda a usar o WhatsApp com tranquilidade e a proteger a sua conta contra golpes.",
    category: "whatsapp",
    app: "WhatsApp",
    modules: [
      {
        title: "O básico",
        lessons: [
          { slug: "enviar-mensagem-e-audio", title: "Enviar mensagem e áudio", summary: "Escrever, gravar e ouvir áudios.", access: "free", transcript: T("Vamos enviar a primeira mensagem.") },
          { slug: "enviar-fotos-e-videos", title: "Enviar fotos e vídeos", summary: "Compartilhe fotos da galeria ou da câmera.", access: "premium", transcript: T("Vamos enviar uma foto.") },
        ],
      },
      {
        title: "Mais segurança",
        lessons: [
          { slug: "verificacao-em-duas-etapas", title: "Verificação em duas etapas", summary: "Uma camada extra de proteção para a sua conta.", access: "premium", transcript: T("Vamos ativar a verificação em duas etapas.") },
          { slug: "reconhecer-golpes-no-whatsapp", title: "Como reconhecer golpes no WhatsApp", summary: "Os golpes mais comuns e como evitar.", access: "premium", transcript: T("Vamos conhecer os sinais de golpe.") },
        ],
      },
    ],
  },
  {
    slug: "seguranca-digital-no-dia-a-dia",
    title: "Segurança digital no dia a dia",
    summary: "Senhas, links falsos e golpes: proteja você e a sua família.",
    description: "Hábitos simples que evitam a maioria dos golpes digitais.",
    category: "seguranca",
    modules: [
      {
        title: "Proteção básica",
        lessons: [
          { slug: "senhas-fortes-e-faceis-de-lembrar", title: "Senhas fortes e fáceis de lembrar", summary: "Um jeito simples de criar boas senhas.", access: "free", transcript: T("Vamos criar uma senha forte.") },
          { slug: "golpes-mais-comuns", title: "Os golpes mais comuns por mensagem", summary: "Falso parente, falso banco e falsa entrega.", access: "premium", transcript: T("Vamos ver os golpes mais comuns.") },
          { slug: "o-que-fazer-se-cair-em-golpe", title: "O que fazer se cair em um golpe", summary: "Os primeiros passos para se proteger.", access: "premium", transcript: T("Vamos ver o que fazer depois de um golpe.") },
        ],
      },
    ],
  },
];

export const shorts = [
  { slug: "tirar-print-da-tela", title: "Como tirar print (foto da tela)", summary: "Na maioria dos celulares Android: aperte ao mesmo tempo o botão de ligar e o de abaixar o volume.", category: "primeiros-passos", access: "free" as const, related: "primeiros-passos-no-android" },
  { slug: "ligar-a-lanterna", title: "Ligar a lanterna em dois toques", summary: "Deslize o dedo de cima para baixo e toque em \"Lanterna\".", category: "primeiros-passos", access: "free" as const, related: "primeiros-passos-no-android" },
  { slug: "fixar-conversa-whatsapp", title: "Fixar uma conversa no WhatsApp", summary: "Toque e segure a conversa e escolha o ícone de alfinete.", category: "whatsapp", access: "premium" as const, related: "whatsapp-sem-complicacao" },
  { slug: "nunca-envie-codigo-sms", title: "Nunca envie o código que chegou por SMS", summary: "Quem pede esse código quer entrar na sua conta.", category: "seguranca", access: "free" as const, related: "seguranca-digital-no-dia-a-dia" },
];

export const articles = [
  {
    slug: "como-reconhecer-um-link-falso",
    title: "Como reconhecer um link falso",
    summary: "Quatro sinais simples para não cair em sites falsos.",
    category: "seguranca",
    access: "free" as const,
    blocks: [
      { type: "paragraph", text: "Links falsos imitam bancos, lojas e órgãos públicos para roubar dados. Antes de tocar, observe com calma." },
      { type: "heading", text: "1. O endereço tem erros ou letras trocadas" },
      { type: "paragraph", text: "Sites falsos usam nomes parecidos com os verdadeiros, com uma letra a mais ou a menos." },
      { type: "heading", text: "2. A mensagem tem pressa" },
      { type: "paragraph", text: "\"Sua conta será bloqueada hoje\" é uma frase típica de golpe." },
      { type: "heading", text: "3. Pede dados que ninguém deveria pedir" },
      { type: "paragraph", text: "Senha, código recebido por SMS e dados completos do cartão não devem ser informados em links recebidos por mensagem." },
      { type: "tip", text: "Na dúvida, não toque no link. Abra o aplicativo oficial do banco ou da loja por conta própria." },
      { type: "warning", text: "Se você já informou dados, entre em contato com o seu banco imediatamente." },
    ],
  },
  {
    slug: "wi-fi-ou-dados-moveis",
    title: "Wi-Fi ou dados móveis: qual a diferença?",
    summary: "Entenda quando usar cada um e como economizar o seu pacote de internet.",
    category: "internet",
    access: "premium" as const,
    blocks: [
      { type: "paragraph", text: "O Wi-Fi é a internet da sua casa ou de um lugar público. Os dados móveis são a internet do seu plano de celular." },
      { type: "heading", text: "Quando usar o Wi-Fi" },
      { type: "paragraph", text: "Para assistir vídeos, fazer chamadas de vídeo e atualizar aplicativos, prefira o Wi-Fi de casa." },
      { type: "heading", text: "Quando usar dados móveis" },
      { type: "paragraph", text: "Fora de casa, para mensagens, mapas e consultas rápidas." },
      { type: "tip", text: "Evite fazer compras ou acessar o banco em Wi-Fi público de shoppings e rodoviárias." },
    ],
  },
];

export const books = [
  {
    slug: "guia-de-bolso-do-whatsapp",
    title: "Guia de bolso do WhatsApp",
    author: "Onzetec Educação",
    synopsis: "Um guia ilustrado para consultar sempre que tiver dúvida no WhatsApp: mensagens, áudios, fotos, grupos e segurança.",
    toc: ["Primeiros passos", "Mensagens e áudios", "Fotos e vídeos", "Grupos", "Segurança da conta"],
    pages: 48,
    included: false,
  },
  {
    slug: "seguranca-digital-para-a-familia",
    title: "Segurança digital para a família",
    author: "Onzetec Educação",
    synopsis: "Como conversar com a família sobre golpes, senhas e privacidade — com listas de verificação para imprimir.",
    toc: ["Os golpes mais comuns", "Senhas e códigos", "Privacidade nas redes", "Plano da família"],
    pages: 64,
    included: true,
  },
];
