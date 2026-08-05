import alessandraVieiraPhoto from '../assets/alessandravieira.png';
import anaCapdevillePhoto from '../assets/anacapdeville.png';
import vitorHugoCovolatoPhoto from '../assets/hugofoto1.jpeg';
import keitySaboyaPhoto from '../assets/keitysaboya.png';
import luizDellorePhoto from '../assets/luizdellore.png';
import michaelDeJesusPhoto from '../assets/michaeldejesus.png';
import otavioVenturiniPhoto from '../assets/otavioventurini.png';
import renatoMachadoPhoto from '../assets/renatomachado.png';
import sarahMarconPhoto from '../assets/sarahmarçon.png';
import tarsoCabralViolinPhoto from '../assets/tarsocabralviolin.png';

export type Speaker = {
  id: string;
  name: string;
  role: string;
  description?: string;
  image: string | null;
  imagePosition?: string;
  imageScale?: number;
  usesFallbackImage: boolean;
};

type SpeakerSeed = Pick<Speaker, 'name' | 'role' | 'description' | 'imagePosition' | 'imageScale'>;

/** Palestrantes ocultos temporariamente na seção pública (cadastro e fotos permanecem). */
const hiddenSpeakerNames = new Set([
  'Ana Capdeville',
  'Luiz Dellore',
  'Otavio Venturini',
  'Renato Machado',
  'Tarso Cabral Violin',
]);

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeLookupValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const lookupTokenStopWords = new Set([
  'de',
  'da',
  'do',
  'dos',
  'das',
  'e',
  'jr',
  'junior',
  'whatsapp',
  'image',
  'img',
  'foto',
  'linkedin',
  'preview',
  'eu',
  'at',
  'wa',
  'prof',
  'profa',
  'professor',
  'lado',
  'pronto',
  'ff',
  'advogados',
  'luciana',
  'cardoso',
  'alta',
  'resolucao',
  'idasan',
  'bma',
]);

const tokenizeLookupValue = (value: string) =>
  Array.from(
    new Set(
      normalizeLookupValue(value)
        .split(/[^a-z0-9]+/g)
        .filter(Boolean)
        .filter((token) => token.length > 1)
        .filter((token) => !/\d/.test(token))
        .filter((token) => !lookupTokenStopWords.has(token)),
    ),
  );

const buildTokenSegments = (tokens: string[]) => {
  const segments = new Set<string>();

  for (let index = 0; index < tokens.length; index += 1) {
    segments.add(tokens[index]);

    if (index + 1 < tokens.length) {
      segments.add(`${tokens[index]} ${tokens[index + 1]}`);
    }

    if (index + 2 < tokens.length) {
      segments.add(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`);
    }
  }

  return Array.from(segments);
};

const compareSpeakerNames = (left: SpeakerSeed, right: SpeakerSeed) =>
  left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });

const speakerPhotoModules = import.meta.glob('../../fotospalestrantes/*.{avif,AVIF,jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const speakerPhotoEntries = Object.entries(speakerPhotoModules).map(([path, src]) => {
  const fileName = path.split('/').pop() ?? path;
  const baseName = fileName.replace(/\.[^.]+$/, '');

  return {
    fileName,
    path,
    src,
    normalizedBaseName: normalizeLookupValue(baseName),
    tokens: tokenizeLookupValue(baseName),
  };
});

const defaultSpeakerImage =
  speakerPhotoEntries.find((photo) => photo.fileName === 'background1.png')?.src ?? null;

const speakerCatalog = [
  {
    name: 'Alice Voronoff',
    role: 'Vice-Presidente do IDASAN',
  },
  {
    name: 'Alessandra Vieira Massa',
    role: 'Corregedora do BRB',
  },
  {
    name: 'Aline Cavalcante dos Reis Silva',
    role: 'Corregedora do Ministério dos Povos Indígenas',
  },
  {
    name: 'Aline Osório',
    role: 'Secretária-Geral do Supremo Tribunal Federal',
  },
  {
    name: 'Ana Capdeville',
    role: 'Diretora de Assuntos Jurídico-Regulatórios',
  },
  {
    name: 'Ana Clara Barcessat',
    role: 'Assessora Executiva de Governança, Gestão de Riscos e Compliance',
  },
  {
    name: 'Ana Luiza Queiroz Melo Jacoby Fernandes',
    role: 'Advogada',
  },
  {
    name: 'Ana Margareth Moreira Mendes Cosenza',
    role: 'Doutora em Direito, Instituições e Negócio; Tenente-Coronel da PMERJ',
  },
  {
    name: 'André Janjácomo Rosilho',
    role: 'Professor da FGV Direito SP',
  },
  {
    name: 'Angélica Petian',
    role: 'Pós-doutora em Direito. Especialista em Infraestrutura',
  },
  {
    name: 'Ana Frazão',
    role: 'Professora Universidade de Brasília - UnB',
  },
  {
    name: 'Antonio Carlos Vasconcellos Nóbrega',
    role: 'Corregedor do Ministério da Fazenda',
  },
  {
    name: 'Antonio Rodrigo Machado',
    role: 'Presidente do Instituto de Direito Administrativo do Distrito Federal',
  },
  {
    name: 'Ariane Shermam Morais Vieira',
    role: 'Doutora em Direito. Assessora no TCEMG',
  },
  {
    name: 'Carlos Nitão',
    role: 'Doutorando em Direito/Procurador Federal - AGU',
  },
  {
    name: 'Carmen Lúcia',
    role: 'Ministra do STF',
    imagePosition: '34% top',
  },
  {
    name: 'Christianne de Carvalho Stroppa',
    role: 'Professora Doutora e Mestre pela PUC/SP',
  },
  {
    name: 'Claudia Braga Tomelin',
    role: 'Secretária Geral do Ministério Público do Distrito Federal e Territórios',
  },
  {
    name: 'Daniel Martins e Avelar',
    role: 'Subcontrolador de Correição do Município de Belo Horizonte',
  },
  {
    name: 'Danielly Cristina Araújo Gontijo',
    role: 'Doutora em Direito Constitucional/Corregedora da Procuradoria-Geral Federal',
  },
  {
    name: 'Diogo Alves Verri Garcia de Souza',
    role: 'Advogado e Professor',
    imagePosition: 'center 32%',
  },
  {
    name: 'Diovane Franco Rodrigues',
    role: 'Advogado e Professor',
  },
  {
    name: 'Fábio Medina Osório',
    role: 'Ex-ministro da Advocacia-Geral da União',
  },
  {
    name: 'Fábio Eduardo Galvão Ferreira Costa',
    role: 'Sócio do Medina Osório Advogados',
  },
  {
    name: 'Felipe Dalenogare Alves',
    role: 'Professor de Direito Administrativo',
  },
  {
    name: 'Flávia Corrêa Azeredo de Freitas',
    role: 'Procuradora Federal - Doutora em Direito do Estado (USP)',
    imagePosition: 'center 18%',
  },
  {
    name: 'Francisco Zardo',
    role: 'Diretor Acadêmico do IDASAN',
  },
  {
    name: 'Giovani Trindade Castanheira Fagg Menicucci',
    role: 'Mestre em Direito. Advogado no BMA',
  },
  {
    name: 'Gustavo Binenbojm',
    role:
      'Professor Titular da UERJ, sócio do Binenbojm, Cyrino, Koatz & Voronoff Advogados',
  },
  {
    name: 'Gustavo Henrique Justino de Oliveira',
    role: 'Prof. Doutor de Direito Administrativo - USP e IDP Brasília. Advogado e consultor jurídico',
  },
  {
    name: 'Isabella Macedo Torres',
    role: 'Advogada',
  },
  {
    name: 'Ilan Presser',
    role: 'Juiz federal',
  },
  {
    name: 'Inês Coimbra',
    role: 'Procuradora-Geral do Estado de São Paulo (PGE-SP)',
  },
  {
    name: 'João Laudo de Camargo',
    role: 'Sócio do Bocater Advogados',
    imagePosition: 'center 22%',
  },
  {
    name: 'Jorge Ulisses Jacoby Fernandes',
    role: 'Advogado e Jornalista',
  },
  {
    name: 'José Guilherme Berman',
    role: 'Advogado e professor da PUC-Rio',
  },
  {
    name: 'José Roberto Pimenta Oliveira',
    role: 'Doutor em Direito do Estado pela PUC-SP e professor de Direito Administrativo da PUC-SP',
    imagePosition: 'center 22%',
    imageScale: 1.45,
  },
  {
    name: 'Júlio Marcelo de Oliveira',
    role:
      'Jurista brasileiro e Procurador do Ministério Público junto ao Tribunal de Contas da União',
  },
  {
    name: 'Juliano Heinen',
    role: 'Procurador do Estado do Rio Grande do Sul',
  },
  {
    name: 'Keity Saboya',
    role: 'Professora Associada da UFRN',
  },
  {
    name: 'Laís Azevedo Vila-Nova de Carvalho',
    role: 'Diretora Executiva Adjunta do IDASAN',
  },
  {
    name: 'Luiz Dellore',
    role: 'Professor e advogado da Caixa Econômica Federal',
  },
  {
    name: 'Luiz Magno P Bastos Jr',
    role: 'Advogado e Professor (UNIVALI/SC)',
    imagePosition: 'center 18%',
  },
  {
    name: 'Marcos Gerhardt Lindenmayer',
    role: 'Corregedor Geral do Estado de São Paulo',
  },
  {
    name: 'Marcelo Costenaro Cavali',
    role: 'Professor de Direito Penal da FGV-SP',
  },
  {
    name: 'Maria Isabel do Prado Bocater',
    role: 'Advogada',
  },
  {
    name: 'Marilene Carneiro Matos',
    role: 'Advogada e Doutora em Direito Público',
  },
  {
    name: 'Mariana de Siqueira',
    role: 'Advogada, professora da UFRN. Doutora em Direito Público pela UFPE.',
  },
  {
    name: 'Matheus Moreira',
    role: 'Advogado e Professor',
  },
  {
    name: 'Otavio Venturini',
    role: 'Doutor e mestre em Direito e Desenvolvimento pela Escola de Direito da Fundação Getúlio Vargas/SP (FGV Direito SP), professor universitário e advogado. Presidente do Comitê de Infraestrutura de Dados do Instituto dos Advogados de São Paulo (Iasp).',
  },
  {
    name: 'Pablo Ademir de Souza',
    role: 'Assessor de Ministro na Controladoria-Geral da União (CGU). Professor',
  },
  {
    name: 'Paulo Modesto',
    role:
      'Secretário Nacional de Assuntos Legislativos. Professor de Dir. Adm (UFBA). Presidente do Instituto Brasileiro de Direito Público',
  },
  {
    name: 'Cristiana Fortini',
    role: 'Professora da UFMG',
    imagePosition: 'center 16%',
  },
  {
    name: 'Michael de Jesus',
    role: 'Doutor em Direito Financeiro pela USP. Procurador do Município de Guarujá',
  },
  {
    name: 'Rodrigo Pironti',
    role: 'Pós-Doutor em Direito pela Universidad Complutense de Madrid e CEO do Pironti+Moura Advogados',
  },
  {
    name: 'Rafael Wallbach Schwind',
    role: 'Doutor em Direito do Estado pela USP (2014)',
  },
  {
    name: 'Raphael de Matos Cardoso',
    role: 'Presidente do IDASAN',
  },
  {
    name: 'Renato Machado',
    role: 'Sócio, Maeda, Ayres e Sarubbi Advogado',
  },
  {
    name: 'Renata Victer',
    role: 'Doutora em Direito da Regulaçao pela FGV Direito Rio. Advogada do BNDES.',
  },
  {
    name: 'Renata Lane',
    role: 'Procuradora do estado de São Paulo',
  },
  {
    name: 'Sandro Lúcio Dezan',
    role: 'Advogado',
    description: 'Uma Teoria do Direito Público Sancionador para Sandro Lúcio Dezan',
  },
  {
    name: 'Sarah Merçon-Vargas',
    role: 'Advogada',
  },
  {
    name: 'Suzana Silva Rodrigues',
    role: 'Chefe de Gabinete da Anatel',
  },
  {
    name: 'Thalita Abdala Aris',
    role: 'Chefe do Jurídico e Compliance da SPTURIS',
  },
  {
    name: 'Tarso Cabral Violin',
    role: 'Pós-Doutor em Direito do Estado pela USP',
  },
  {
    name: 'Tassiane de Fátima Moraes',
    role: 'Procuradora Legislativa',
  },
  {
    name: 'Vanir Fridriczewski',
    role:
      'Doutor e Pós Doutor pela Universidade de Salamanca, na Espanha. Advogado da União e Assessor de Ministro no STF. Professor Universitário',
    imagePosition: 'center 18%',
  },
  {
    name: 'Vera Lúcia Santana Araújo',
    role: 'Advogada',
  },
  {
    name: 'Vinícius Marques de Carvalho',
    role: 'Ministro da Controladoria-Geral da União do Brasil',
  },
  {
    name: 'Vitor Hugo Jacob Covolato',
    role: 'Advogado',
  },
  {
    name: 'Vládia Pompeu',
    role: 'Procuradora da Fazenda - Atual Corregedora do Ministério dos Portos e Aeroportos',
  },
] satisfies SpeakerSeed[];

const speakerDirectory = speakerCatalog.map((speaker) => {
  const tokens = tokenizeLookupValue(speaker.name);

  return {
    ...speaker,
    normalizedName: normalizeLookupValue(speaker.name),
    tokenSet: new Set(tokens),
    tokenSegments: buildTokenSegments(tokens),
  };
});

const speakerNamesByToken = speakerDirectory.reduce<Map<string, string[]>>((accumulator, speaker) => {
  speaker.tokenSet.forEach((token) => {
    const currentNames = accumulator.get(token) ?? [];
    accumulator.set(token, [...currentNames, speaker.name]);
  });

  return accumulator;
}, new Map());

const getPhotoSpeakerScore = (
  photo: (typeof speakerPhotoEntries)[number],
  speaker: (typeof speakerDirectory)[number],
) => {
  const overlappingTokens = photo.tokens.filter((token) => speaker.tokenSet.has(token));
  const uniqueOverlappingTokens = overlappingTokens.filter(
    (token) => (speakerNamesByToken.get(token) ?? []).length === 1,
  );

  let score = overlappingTokens.length * 10 + uniqueOverlappingTokens.length * 20;

  if (
    photo.normalizedBaseName.includes(speaker.normalizedName) ||
    speaker.normalizedName.includes(photo.normalizedBaseName)
  ) {
    score += 120;
  }

  speaker.tokenSegments.forEach((segment) => {
    if (!segment.includes(' ')) {
      return;
    }

    if (photo.normalizedBaseName.includes(segment)) {
      score += segment.split(' ').length === 3 ? 70 : 45;
    }
  });

  if (/\(\d+\)|copy|copia/.test(photo.normalizedBaseName)) {
    score -= 5;
  }

  return score;
};

const candidatePhotoAssignments = speakerPhotoEntries
  .map((photo) => {
    const rankedSpeakers = speakerDirectory
      .map((speaker) => ({
        speakerName: speaker.name,
        score: getPhotoSpeakerScore(photo, speaker),
      }))
      .sort((left, right) => right.score - left.score);

    const [bestMatch, secondBestMatch] = rankedSpeakers;
    const secondBestScore = secondBestMatch?.score ?? 0;
    const isConfidentMatch = bestMatch.score >= 30 && bestMatch.score - secondBestScore >= 20;

    if (!isConfidentMatch) {
      return null;
    }

    return {
      ...photo,
      speakerName: bestMatch.speakerName,
      score: bestMatch.score,
    };
  })
  .filter((assignment): assignment is NonNullable<typeof assignment> => assignment !== null);

const preferredPhotoFileNameBySpeaker = new Map<string, string>([
  ['Alice Voronoff', 'alice voronoff.png'],
  ['Aline Osório', 'alineosorio.webp'],
  ['Ana Clara Barcessat', 'A84AD0BF-C0E5-403E-9820-42938046BA6D - Ana Clara Barcessat.jpeg'],
  ['Ana Frazão', 'draanafrazao.png'],
  ['Ana Margareth Moreira Mendes Cosenza', 'Ana Mendes Consenza.png'],
  ['Angélica Petian', 'angelicapetian.JPG'],
  ['Claudia Braga Tomelin', 'claudiabragatomelin.png'],
  ['Antonio Rodrigo Machado', 'Antonio Rodrigo Machado.png'],
  ['Carmen Lúcia', 'foto-diego-bresani---minist.webp'],
  ['Christianne de Carvalho Stroppa', 'Christianne de Carvalho Stroppa.png'],
  ['Cristiana Fortini', 'Cristiana Fortini.png'],
  ['Fábio Eduardo Galvão Ferreira Costa', 'WhatsApp Image 2026-06-17 at 17.39.40 - Fabio Galvao.jpeg'],
  ['Gustavo Binenbojm', 'gustavobinenbojm.jpg'],
  ['Gustavo Henrique Justino de Oliveira', '06808AEB-A1E6-4E2C-9BE2-A24B66F88C27 - Gustavo Henrique Justino de Oliveira.jpeg'],
  ['Inês Coimbra', 'Inescoimbra.webp'],
  ['Juliano Heinen', 'Foto - Juliano H.jpg'],
  ['Júlio Marcelo de Oliveira', 'juliomarcelodeoliveira.jpg'],
  ['José Guilherme Berman', 'joseguilhermeberman.png'],
  ['José Roberto Pimenta Oliveira', 'joserobertopimenta.jpeg'],
  ['Ilan Presser', 'ilanpressser.jpg'],
  ['Isabella Macedo Torres', 'MMN_8928 - Isabella.jpg'],
  ['João Laudo de Camargo', 'Joao-Laudo-de-Camargo.jpg'],
  ['Marcelo Costenaro Cavali', 'foto divulgação - MARCELO COSTENARO CAVALI.jpeg'],
  ['Marcos Gerhardt Lindenmayer', 'WhatsApp Image 2026-01-15 at 09.30.25 - Marcos Lindenmayer.jpeg'],
  ['Mariana de Siqueira', 'WhatsApp Image 2026-06-17 at 06.27.18 - Mariana Siqueira.jpeg'],
  ['Matheus Moreira', 'WhatsApp Image 2026-03-16 at 14.47.48 - Matheus Alves Moreira da Silva.jpeg'],
  ['Michael de Jesus', '059_Michael_Boxfotografia_220920 - Michael de Jesus.jpeg'],
  ['Pablo Ademir de Souza', 'Pablo Ademir de Souza1.png'],
  ['Paulo Modesto', 'paulomodesto.jpg'],
  ['Rodrigo Pironti', 'IMG_6267 - Pironti.jpeg'],
  ['Sandro Lúcio Dezan', 'Foto Divulgação - Sandro Dezan - Sandro Lucio Dezan.jpeg'],
  ['Suzana Silva Rodrigues', 'suzanasilva.jpeg'],
  ['Renata Victer', 'WhatsApp Image 2026-04-01 at 19.04.22 (1) - Renata Maccacchero Victer.jpeg'],
  ['Thalita Abdala Aris', 'Thalita Abdala Aris.png'],
  ['Vanir Fridriczewski', 'vanirfidriczewski.JPG'],
  ['Vinícius Marques de Carvalho', 'MinistroViniciusdeCarvalho.jpg'],
]);

const speakerImagesByName = candidatePhotoAssignments.reduce<Map<string, string>>((accumulator, assignment) => {
  const existingAssignment = accumulator.get(assignment.speakerName);

  if (!existingAssignment) {
    accumulator.set(assignment.speakerName, assignment.src);
    return accumulator;
  }

  const existingPhoto = candidatePhotoAssignments.find(
    (candidate) => candidate.speakerName === assignment.speakerName && candidate.src === existingAssignment,
  );

  if (!existingPhoto) {
    accumulator.set(assignment.speakerName, assignment.src);
    return accumulator;
  }

  const shouldReplace =
    assignment.score > existingPhoto.score ||
    (assignment.score === existingPhoto.score && assignment.path.localeCompare(existingPhoto.path) < 0);

  if (shouldReplace) {
    accumulator.set(assignment.speakerName, assignment.src);
  }

  return accumulator;
}, new Map());

preferredPhotoFileNameBySpeaker.forEach((fileName, speakerName) => {
  const preferredPhoto = speakerPhotoEntries.find((photo) => photo.fileName === fileName);

  if (preferredPhoto) {
    speakerImagesByName.set(speakerName, preferredPhoto.src);
  }
});

speakerImagesByName.set('Alessandra Vieira Massa', alessandraVieiraPhoto);
speakerImagesByName.set('Ana Capdeville', anaCapdevillePhoto);
speakerImagesByName.set('Keity Saboya', keitySaboyaPhoto);
speakerImagesByName.set('Luiz Dellore', luizDellorePhoto);
speakerImagesByName.set('Michael de Jesus', michaelDeJesusPhoto);
speakerImagesByName.set('Otavio Venturini', otavioVenturiniPhoto);
speakerImagesByName.set('Renato Machado', renatoMachadoPhoto);
speakerImagesByName.set('Sarah Merçon-Vargas', sarahMarconPhoto);
speakerImagesByName.set('Tarso Cabral Violin', tarsoCabralViolinPhoto);
speakerImagesByName.set('Vitor Hugo Jacob Covolato', vitorHugoCovolatoPhoto);

export const speakers: Speaker[] = [...speakerCatalog]
  .filter((speaker) => !hiddenSpeakerNames.has(speaker.name))
  .sort(compareSpeakerNames)
  .map((speaker) => {
    const id = slugify(speaker.name);
    const explicitImage = speakerImagesByName.get(speaker.name);
    const usesFallbackImage = !explicitImage && defaultSpeakerImage !== null;

    return {
      id,
      image: explicitImage ?? defaultSpeakerImage,
      usesFallbackImage,
      ...speaker,
    };
  });

const speakersByName = new Map(speakers.map((speaker) => [speaker.name, speaker]));

export const getSpeakerByName = (name: string): Speaker | undefined => speakersByName.get(name);

export const speakerCount = speakers.length;
