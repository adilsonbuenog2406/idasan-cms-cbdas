import placeholderProfile from '../assets/placeholder-profile.svg';
import idasanRio from '../assets/idasanrio.webp';
import idasanSampa from '../assets/idasansampa.webp';
import { getSpeakerByName } from '../data/speakers';

export type ParticipantProfile = {
  name: string;
  surname: string;
  role: string;
  photo: string;
  photoPosition?: string;
};

export type ScheduleEventType =
  | 'panel'
  | 'conference'
  | 'ceremony'
  | 'special'
  | 'service'
  | 'break';

export type ScheduleEvent = {
  time: string;
  title: string;
  type: ScheduleEventType;
  speakers?: ParticipantProfile[];
};

export type ScheduleDay = {
  date: string;
  title: string;
  events: ScheduleEvent[];
};

export type WorkshopItem = {
  order: number;
  time: string;
  title: string;
  participants?: ParticipantProfile[];
};

export type WorkshopDay = {
  day: string;
  items: WorkshopItem[];
};

export type RegistrationBatch = {
  id: string;
  name: string;
  status: 'active' | 'upcoming' | 'closed';
  period: string;
  prices: { label: string; value: string }[];
  limit?: string;
  description?: string;
  tag?: string;
};

export type RegistrationDiscountStage = {
  id: string;
  title: string;
  period: string;
  benefit: string;
};

const participantFromCatalog = (catalogName: string, role?: string): ParticipantProfile => {
  const speaker = getSpeakerByName(catalogName);
  const parts = catalogName.trim().split(/\s+/);
  const [firstName = catalogName, ...surnameParts] = parts;

  return {
    name: firstName,
    surname: surnameParts.join(' '),
    role: role ?? speaker?.role ?? 'Palestrante',
    photo: speaker?.image ?? placeholderProfile,
    photoPosition: speaker?.imagePosition,
  };
};

const schedule: ScheduleDay[] = [
  {
    date: "20/08",
    title: "Dia 1",
    events: [
      { time: "08h30 – 09h00", title: "Credenciamento", type: "service" },
      { time: "09h00", title: "Abertura", type: "ceremony" },
      {
        time: "09h30",
        title:
          "Conferência de abertura — Gênero e ética na democracia: como isso impacta o Direito Administrativo Sancionador?",
        type: "conference",
        speakers: [
          participantFromCatalog('Carmen Lúcia', 'Autoridade — Ministra do STF'),
        ],
      },
      {
        time: "10h – 11h15",
        title: "Painel 1: Tribunais de Contas, medidas cautelares, dever de ressarcimento e sanções",
        type: "panel",
        speakers: [
          participantFromCatalog(
            'Ana Luiza Queiroz Melo Jacoby Fernandes',
            'Presidente da mesa',
          ),
          participantFromCatalog('Júlio Marcelo de Oliveira', 'Palestrantee'),
          participantFromCatalog('Flávia Corrêa Azeredo de Freitas', 'Palestrante'),
          participantFromCatalog('André Janjácomo Rosilho', 'Palestrante'),
        ],
      },
      {
        time: "11h15 - 12h30",
        title: "Painel 2: DAS e a lei de inelegibilidade",
        type: "panel",
        speakers: [
          participantFromCatalog('Laís Azevedo Vila-Nova de Carvalho', 'Presidente da mesa'),
          participantFromCatalog('Vera Lúcia Santana Araújo', 'Palestrante'),
          participantFromCatalog('Aline Osório', 'Palestrante'),
          participantFromCatalog('Luiz Magno P Bastos Jr', 'Palestrante'),
        ],
      },
      {
        time: "14h15 – 15h30",
        title: "Painel 3: Empresas estatais: nuances e questões polêmicas de DAS nos 10 anos de Estatuto",
        type: "panel",
        speakers: [
          participantFromCatalog('Diogo Alves Verri Garcia de Souza', 'Palestrante'),
          participantFromCatalog('Rafael Wallbach Schwind', 'Palestrante'),
          participantFromCatalog('Christianne de Carvalho Stroppa', 'Palestrante'),
          participantFromCatalog('João Laudo de Camargo', 'Palestrante'),
        ],
      },
      {
        time: "15h45 - 16h30",
        title: "Painel 4: O conflito de interesses na administração pública: infração e julgamento",
        type: "panel",
        speakers: [
          participantFromCatalog('Pablo Ademir de Souza', 'Presidente da mesa'),
          participantFromCatalog('Antonio Carlos Vasconcellos Nóbrega', 'Palestrante'),
          participantFromCatalog('Cristiana Fortini', 'Palestrante'),
          participantFromCatalog('Vanir Fridriczewski', 'Palestrante'),
        ],
      },
      { time: "16h30 – 16h50", title: "Coffee Break", type: "break" },
      {
        time: "17h00 - 17h30",
        title: "IDASANcast: garantias no processo administrativo sancionador",
        type: "special",
        speakers: [
          participantFromCatalog('Thalita Abdala Aris', 'Entrevistadora'),
          participantFromCatalog(
            'Gustavo Henrique Justino de Oliveira',
            'Entrevistado',
          ),
        ],
      },
      {
        time: "17h30 - 18h30",
        title: "Conferência especial: Reforma administrativa e responsabilização: gestão por resultados, transformação digital e efeitos no sistema sancionador",
        type: "conference",
        speakers: [
          participantFromCatalog('Paulo Modesto'),
        ],
      },
      {
        time: "18h30 - 19h",
        title: "Lançamentos — um coordenador de cada volume",
        type: "ceremony",
      },
    ]
  },
  {
    date: "21/08",
    title: "Dia 2",
    events: [
      {
        time: "9h - 10h15",
        title: "Painel 5: O papel do DAS na regulação de serviços públicos e incentivo de conformidade",
        type: "panel",
        speakers: [
          participantFromCatalog('Inês Coimbra'),
          participantFromCatalog('Gustavo Binenbojm'),
          participantFromCatalog('Ana Frazão', 'Palestrante'),
        ],
      },
      {
        time: "10h15 – 11h30",
        title: "Painel 6: DAS na CVM e no Banco Central e o controle externo",
        type: "panel",
        speakers: [
          participantFromCatalog(
            'Fábio Eduardo Galvão Ferreira Costa',
            'Presidente da mesa',
          ),
          participantFromCatalog('Maria Isabel do Prado Bocater', 'Palestrante'),
          participantFromCatalog('Fábio Medina Osório', 'Palestrante'),
          participantFromCatalog('Renata Victer', 'Palestrante'),
        ],
      },
      {
        time: "11h30 – 12h30",
        title:
          "CILADAS: Credibilidade institucional e DAS: interdependência entre as instâncias e abuso de poder",
        type: "special",
        speakers: [
          participantFromCatalog('Marilene Carneiro Matos', 'Presidente da mesa'),
          participantFromCatalog('Marcelo Costenaro Cavali', 'Palestrante'),
          participantFromCatalog('Carlos Nitão', 'Palestrante'),
          participantFromCatalog('Keity Saboya', 'Palestrante'),
        ],
      },
      {
        time: "14h30 - 15h45",
        title: "Painel 7: Governança e integridade pública: aplicação e impacto na atividade sancionatória",
        type: "panel",
        speakers: [
          participantFromCatalog('José Guilherme Berman', 'Presidente da mesa'),
          participantFromCatalog('Marcos Gerhardt Lindenmayer', 'Palestrante'),
          participantFromCatalog('Claudia Braga Tomelin', 'Palestrante'),
        ],
      },
      {
        time: "15h45 – 16h15",
        title: "Prêmio IDASAN de Ouro ou Notáveis IDASAN — Artigos científicos (Comissão de Artigos)",
        type: "ceremony",
      },
      { time: "16h15 – 16h30", title: "Coffee Break", type: "break" },
      {
        time: "16h30 - 17h",
        title: "Conferência especial: Improbidade e DAS: convergências, prova, prescrição e segurança jurídica",
        type: "conference",
        speakers: [
          participantFromCatalog(
            'Ana Luiza Queiroz Melo Jacoby Fernandes',
            'Conferencista',
          ),
        ],
      },
      {
        time: "17h – 18h",
        title:
          "Conferência de encerramento: Precisamos falar de uma lei geral de DAS? Competências federativas e a realidade de Estados e Municípios — Sistematização do DAS",
        type: "conference",
        speakers: [
          participantFromCatalog('Alice Voronoff', 'Conferencista'),
          participantFromCatalog(
            'Giovani Trindade Castanheira Fagg Menicucci',
            'Conferencista',
          ),
        ],
      },
    ]
  }
];

export const eventData = {
  general: {
    title: "IIIº CBDAS",
    shortTitle: "IIIº CBDAS",
    date: "20 e 21 de agosto",
    location: "Centro Internacional de Convenções do Brasil (CICB)",
    fullAddress: "SCES, Asa Sul Trecho 2 Conjunto 63 Lote 50 - Plano Piloto, Brasília - DF",
    ctaLink: "https://www.eventweb.com.br/iii_cbdas/home-event/",
    quotaPolicyLink: "#", // Placeholder
    idasanSiteUrl: "https://idasan.com.br",
    sponsorFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSczNtrBcQndorRXiGjOzr9X2pCgn4PlsxqT9zxMHquvpoaQHQ/viewform",
  },
  links: {
    instagram: "https://www.instagram.com/insta.idasan/",
    linkedin: "https://www.linkedin.com/company/idasan/posts/?feedView=all&viewAsMember=true",
    youtube: "https://www.youtube.com/@idasan9159",
    facebook: "#",
    email: "contato@idasan.com.br", // Placeholder
    i_cbdas: "https://idasan.com.br/i-congresso-brasileiro-de-direito-administrativo-sancionador",
    ii_cbdas: "https://idasan.com.br/ii-congresso-brasileiro-de-direito-administrativo-sancionador",
    articleSubmission: "https://www.eventweb.com.br/iii_cbdas/home-event/",
    articleInstructions:
      "https://drive.google.com/drive/u/0/folders/1lP3GMHOVfJF5ooIos8ABXinALEDs-bMv",
  },
  registrationDiscounts: {
    title: "Inscrições para Submissões de Artigos",
    subtitle: "Confira os períodos de inscrição e os benefícios disponíveis para cada etapa.",
    ctaLabel: "Inscreva-se",
    stages: [
      {
        id: "stage-1",
        title: "1ª etapa",
        period: "01/06/2026 a 30/06/2026",
        benefit: "100% de isenção",
      },
      {
        id: "stage-2",
        title: "2ª etapa",
        period: "01/07/2026 a 20/07/2026",
        benefit: "30% de desconto",
      },
    ] satisfies RegistrationDiscountStage[],
  },
  about: {
    text: [
      "O congresso brasileiro de direito administrativo sancionador chega à sua terceira edição consolidado como o principal fórum nacional dedicado ao estudo, debate e desenvolvimento do Direito Administrativo Sancionador.",
      "Sediado desta vez em Brasília, o IIIº CBDAS reunirá especialistas, autoridades públicas, acadêmicos e profissionais de todas as regiões do país, promovendo o diálogo entre teoria, legislação e prática.",
      "O congresso reafirma seu compromisso com a diversidade regional, racial e de gênero, assegura pluralidade de perspectivas e fortalece o desenvolvimento institucional do Direito Administrativo Sancionador no Brasil."
    ]
  },
  institution: {
    text: "O Instituto de Direito Administrativo Sancionador Brasileiro (IDASAN) é uma organização dedicada ao estudo, pesquisa e desenvolvimento do Direito Administrativo Sancionador no Brasil. Focado na disseminação de conhecimento e na formação de uma comunidade jurídica qualificada, o IDASAN reúne acadêmicos, profissionais e especialistas para debater, analisar, ensinar e conectar diversas perspectivas do Direito Administrativo Sancionador, por meio de eventos, publicações e projetos educativos."
  },
  pastEditions: [
    {
      id: "i-cbdas",
      title: "Iº CBDAS",
      subtitle: "Rio de Janeiro | 2024",
      description: "O primeiro CBDAS marcou o início de um projeto que reuniu especialistas, acadêmicos e profissionais para debater os rumos e desafios do DAS no Brasil.",
      image: idasanRio,
      details: [
        { label: "Correalização", value: "FIRJAN" }
      ],
      links: {
        more: "https://idasan.com.br/cbdas/i-cbdas",
        records: "https://idasan.com.br/blog/43-i-congresso-brasileiro-de-direito-administrativo-sancionador-que-aconteceu-no-rio-de-janeiro-em-correalizacao-com-a-firjan"
      }
    },
    {
      id: "ii-cbdas",
      title: "IIº CBDAS",
      subtitle: "São Paulo | 2025",
      description: "Com mais de 300 participantes, o congresso consolidou o evento como um dos principais fóruns de debate sobre Direito Administrativo Sancionador, reunindo especialistas, autoridades e profissionais de diferentes regiões e instituições em um ambiente marcado pela pluralidade, diversidade de perspectivas e elevado nível técnico.",
      image: idasanSampa,
      details: [],
      links: {
        more: "https://idasan.com.br/ii-congresso-brasileiro-de-direito-administrativo-sancionador",
        records: "https://idasan.com.br/blog/66-cbdas-dois-dias-de-debates-conexoes-e-avancos-no-direito-administrativo-sancionador"
      }
    }
  ],
  schedule,
  workshops: [
    {
      day: "Dia 1",
      items: [
        {
          order: 1,
          time: "10h00 - 12h00",
          title: "Oficina 1: Provas digitais e analógicas no DAS: cadeia de custódia, contraditório e standards probatórios",
          participants: [
            participantFromCatalog('Aline Cavalcante dos Reis Silva'),
            participantFromCatalog('Renata Lane'),
            participantFromCatalog('Antonio Rodrigo Machado'),
          ],
        },
        {
          order: 2,
          time: "10h00 - 12h00",
          title: "Oficina 2: A prescrição no processo administrativo sancionador: um tema mal resolvido?",
          participants: [
            participantFromCatalog('Sarah Merçon-Vargas'),
            participantFromCatalog('Sandro Lúcio Dezan'),
            participantFromCatalog('Ariane Shermam Morais Vieira'),
          ],
        },
        {
          order: 3,
          time: "14h00 - 16h00",
          title: "Oficina 3: Revisão judicial do PAD e súmulas do STJ",
          participants: [
            participantFromCatalog('Francisco Zardo'),
            participantFromCatalog('Mariana de Siqueira'),
            participantFromCatalog('Ana Margareth Moreira Mendes Cosenza'),
          ],
        },
        {
          order: 4,
          time: "14h00 - 16h00",
          title: "Oficina 4: Caducidade em concessões",
          participants: [
            participantFromCatalog('Juliano Heinen'),
            participantFromCatalog('Suzana Silva Rodrigues'),
            participantFromCatalog('Angélica Petian'),
          ],
        }
      ]
    },
    {
      day: "Dia 2",
      items: [
        {
          order: 5,
          time: "09h00 - 10h30",
          title: "Oficina 5: Assédio e repercussões disciplinares: questões relevantes sobre garantias processuais",
          participants: [
            participantFromCatalog('Danielly Cristina Araújo Gontijo'),
            participantFromCatalog('Vládia Pompeu'),
            participantFromCatalog('Daniel Martins e Avelar'),
            participantFromCatalog('Michael de Jesus'),
          ],
        },
        {
          order: 6,
          time: "09h00 - 10h30",
          title: "Oficina 6: Matriz de tipificação e dosimetria na NLLC, motivação e prevenção de nulidades",
          participants: [
            participantFromCatalog('Tassiane de Fátima Moraes'),
            participantFromCatalog('Felipe Dalenogare Alves'),
            participantFromCatalog('Matheus Moreira'),
          ],
        },
        {
          order: 7,
          time: "10h30 - 12h00",
          title: "Plenária Glossário DAS IDASAN",
          participants: [
            participantFromCatalog('Rafael Wallbach Schwind'),
            participantFromCatalog('Alessandra Vieira Massa'),
            participantFromCatalog('Felipe Dalenogare Alves'),
          ],
        },
        {
          order: 8,
          time: "14h00 - 16h00",
          title: "Oficina 7: DAS ambiental: questões controvertidas",
          participants: [
            participantFromCatalog('Diovane Franco Rodrigues'),
            participantFromCatalog('Ana Clara Barcessat'),
            participantFromCatalog('Ilan Presser'),
            participantFromCatalog('José Roberto Pimenta Oliveira'),
          ],
        },
        {
          order: 9,
          time: "14h00 - 16h00",
          title: "Oficina 8: DAS na LGPD: ECA Digital e responsabilidade de plataformas digitais por conteúdo de terceiros (Temas 987 e 533)",
          participants: [
            participantFromCatalog('Isabella Macedo Torres'),
            participantFromCatalog('Rodrigo Pironti'),
          ],
        }
      ]
    }
  ] as WorkshopDay[],
  registration: {
    closingNotice: "Encerramento das inscrições no dia 18/08/2026.",
    batches: [
      {
        id: "batch3",
        name: "Lote 3",
        status: "active",
        period: "02/08 a 18/08",
        prices: [
          { label: "Público Geral", value: "R$ 1.500,00" },
          { label: "Associados", value: "R$ 750,00" },
          { label: "Estudantes", value: "R$ 400,00" },
          { label: "Pós-Graduação", value: "R$ 1.200,00" },
          { label: "Grupo (10 a 19 inscrições)", value: "R$ 1.350,00" },
          { label: "Grupo (20 a 29 inscrições)", value: "R$ 1.200,00" },
          { label: "Grupo (30 a 39 inscrições)", value: "R$ 1.050,00" },
          { label: "Grupo (40 a 49 inscrições)", value: "R$ 900,00" },
          { label: "Grupo (a partir de 50 inscrições)", value: "R$ 750,00" }
        ]
      }
    ] as RegistrationBatch[]
  },
  commitment: {
    companyName: "INSTITUTO DE DIREITO ADMINISTRATIVO SANCIONADOR BRASILEIRO - IDASAN",
    cnpj: "39.963.974/0001-06",
    address: "Rua Correia de Lemos, n° 645, unidade 43, São Paulo/SP, CEP 41.400-000",
    bankDetails: "Banco Itaú, Agência 1664, Conta 99539-4",
    docsLink: "https://drive.google.com/drive/folders/1x0YD9AyQhk0VHYiWMzZebGnGW8ZOy6bg?usp=sharing"
  },
  testimonials: [
    { text: "Parabéns pelo evento. Foi uma ótima experiência para discutir temas relevantes sobre o DAS, bem como para conhecer referências na área, além de permitir a interação com novos colegas." },
    { text: "Parabéns à diretoria do Idasan pela organização impecável do evento." },
    { text: "Excelente evento. Parabéns aos organizadores." },
    { text: "Excelente evento. Parabéns." }
  ]
};
