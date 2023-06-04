import { processing } from "@auto-gpt-ts/core";
import { loadEnv, buildTestAgent, ICommandContext, prepare_test_logger } from "@auto-gpt-ts/core";
import { commands } from "@auto-gpt-ts/core";
import ConsoleLogger from "../loggers/console_logger";

describe('testStrings', () => {
    const url = "https://en.wikipedia.org/wiki/Marie_Curie";
    const question = "What was Marie Curie profession?";

    it('should correctly split sentences', async () => {
        const sentencizer = processing.createSentencizer('test');
        const sentences = await sentencizer('cl100k_base', 'Hola. Me llamo Pedro. Buenos días!');
        expect(sentences.sents.length).toBe(3);
        expect(sentences.sents[0].text).toBe('Hola.');
        expect(sentences.sents[1].text).toBe('Me llamo Pedro.');
        expect(sentences.sents[2].text).toBe('Buenos días!');
    });

    it('should group sentences fast', async () => {
        const agent = await buildTestAgent( await prepare_test_logger( [ new ConsoleLogger() ]) );
        const ctx : ICommandContext = {
            ...loadEnv(),
            agent
        }
    
        const sentence = "Marie Curie - Wikipedia Jump to content Main menu Main menu move to sidebar hide Navigation Main pageContentsCurrent eventsRandom articleAbout WikipediaContact usDonate Contribute HelpLearn to editCommunity portalRecent changesUpload file Languages Language links are at the top of the page across from the title. Search Create accountLog in Personal tools Create account Log in Pages for logged out editors learn more ContributionsTalk Contents move to sidebar hide (Top) 1Life Toggle Life subsection 1. 1Early years 1. 2Life in Paris 1. 3New elements 1. 4Nobel Prizes 1. 5World War I 1. 6Postwar years 1. 7Death 2Legacy 3Commemoration and cultural depictions 4See also 5Notes 6References 7Further reading Toggle Further reading subsection 7. 1Nonfiction 7. 2Fiction 8External links Toggle the table of contents Toggle the table of contents Marie Curie 175 languages AfrikaansAlemannischАлтай тилአማርኛAnarâškielâالعربيةAragonésArmãneashtiঅসমীয়াAsturianuAvañe'ẽAymar aruAzərbaycancaتۆرکجهBasa BaliবাংলাBân-lâm-gúBasa BanyumasanБашҡортсаБеларускаяБеларуская (тарашкевіца)भोजपुरीBikol CentralBislamaБългарскиBoarischBosanskiBrezhonegБуряадCatalàЧӑвашлаCebuanoČeštinaCymraegDanskDeutschडोटेलीEestiΕλληνικάEspañolEsperantoEstremeñuEuskaraفارسیFiji HindiFøroysktFrançaisFryskGaeilgeGàidhligGalego贛語ગુજરાતી客家語/Hak-kâ-ngî한국어HausaՀայերենहिन्दीHrvatskiIdoIlokanoBahasa IndonesiaInterlinguaÍslenskaItalianoעבריתJawaKabɩyɛಕನ್ನಡKapampanganქართულიकॉशुर / کٲشُرKaszëbscziҚазақшаKernowekKiswahiliKreyòl ayisyenKriyòl gwiyannenKurdîКыргызчаLadinoLatinaLatviešuLëtzebuergeschLietuviųLigureLimburgsLivvinkarjalaLa .lojban.LombardMagyarमैथिलीМакедонскиMalagasyമലയാളംMaltiमराठीმარგალურიمصرىمازِرونیBahasa Melayuꯃꯤꯇꯩ ꯂꯣꯟMinangkabauМонголမြန်မာဘာသာNāhuatlNederlandsNedersaksiesनेपालीनेपाल भाषा日本語НохчийнNordfriiskNorsk bokmålNorsk nynorskOccitanଓଡ଼ିଆOromooOʻzbekcha / ўзбекчаਪੰਜਾਬੀپنجابیپښتوPatoisភាសាខ្មែរPicardPiemontèisPlattdüütschPolskiPortuguêsQaraqalpaqshaQırımtatarcaRomânăRuna SimiРусиньскыйРусскийСаха тылаसंस्कृतम्ᱥᱟᱱᱛᱟᱲᱤScotsShqipSicilianuසිංහලSimple EnglishسنڌيSlovenčinaSlovenščinaکوردیСрпски / srpskiSrpskohrvatski / српскохрватскиSundaSuomiSvenskaTagalogதமிழ்Татарча / tatarçaతెలుగుไทยತುಳುTürkçeТыва дылУкраїнськаاردوVepsän kel’Tiếng ViệtVolapük文言Winaray吴语ייִדישYorùbá粵語ZazakiZeêuwsŽemaitėška中文 Edit links Article Talk English Read View source View history Tools Tools move to sidebar hide Actions ReadView sourceView history General What links hereRelated changesUpload fileSpecial pagesPermanent linkPage informationCite this pageWikidata item Print/export Download as PDFPrintable version In other projects Wikimedia CommonsWikiquoteWikisource From Wikipedia, the free encyclopedia Polish-French physicist and chemist (1867–1934) This article is about the Polish-French physicist. For the musician, see Marie Currie. For other uses, see Marie Curie (disambiguation). In this Slavic name, the surname is Skłodowska, sometimes transliterated as Sklodowska. Marie CurieMaria Skłodowska-CurieCurie, c. 1920BornMaria Salomea Skłodowska(1867-11-07)7 November 1867Warsaw, Congress Poland, Russian Empire[1]Died4 July 1934(1934-07-04) (aged 66)Passy, Haute-Savoie, FranceCause of deathAplastic anemia[2]CitizenshipPoland (by birth)France (by marriage)Alma materUniversity of ParisESPCI[3]Known forPioneering research on radioactivityDiscovering polonium and radiumSpouse Pierre Curie ​ ​(m. 1895; died 1906)​ChildrenIrèneÈveAwardsNobel Prize in Physics (1903)Davy Medal (1903)Matteucci Medal (1904)Actonian Prize (1907)Elliott Cresson Medal (1909)Albert Medal (1910)Nobel Prize in Chemistry (1911)Willard Gibbs Award (1921)Cameron Prize for Therapeutics of the University of Edinburgh (1931)Scientific careerFieldsPhysicschemistryInstitutions University of Paris Institut du Radium École Normale Supérieure French Academy of Medicine International Committee on Intellectual Cooperation ThesisRecherches sur les substances radioactives (Research on Radioactive Substances) (1903)Doctoral advisorGabriel LippmannDoctoral studentsAndré-Louis DebierneLadislas GoldsteinÉmile HenriotIrène Joliot-CurieÓscar MorenoMarguerite PereyFrancis Perrin SignatureNotesShe is the only person to win a Nobel Prize in two sciences. Birthplace, ulica Freta 16, Warsaw Marie Salomea Skłodowska–Curie (/ˈkjʊəri/ KURE-ee,[4] French pronunciation: ​[maʁi kyʁi], Polish pronunciation: [ˈmarja salɔˈmɛa skwɔˈdɔfska kʲiˈri]; born Maria Salomea Skłodowska, Polish: [ˈmarja salɔˈmɛa skwɔˈdɔfska]; 7 November 1867 – 4 July 1934) was a Polish and naturalized-French physicist and chemist who conducted pioneering research on radioactivity. She was the first woman to win a Nobel Prize, the first person to win a Nobel Prize twice, and the only person to win a Nobel Prize in two scientific fields. She was a remarkable woman. ";
        const now = new Date().getTime();
        for await( const chunk of processing.split_text(sentence, ctx.browser.browse_chunk_max_length, ctx.llm.models.fast_llm_model, ctx.llm.embeddings.tokenizer, question) ) {
            const elapsed = new Date().getTime() - now;
            console.log("CHUNK processed in " + elapsed + "ms");
        }
        let elapsed2 = new Date().getTime() - now;
        expect(elapsed2).toBeLessThan(1000);
    });
    
    it('should summarize some Wikipedia article', async () => {
        const agent = await buildTestAgent( await prepare_test_logger([ new ConsoleLogger() ]) );
        const ctx : ICommandContext = {
            ...loadEnv(),
            agent
        }
    
        const summary = await commands.web_requests.get_text_summary(ctx, { url, question });
        expect(summary).toContain("physicist");
        expect(summary).toContain("chemist");
    }, 600000);

  });