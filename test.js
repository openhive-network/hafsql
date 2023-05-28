// import pg from 'pg'
import { pool } from './helpers/database.js'
// import DiffMatchPatch from 'diff-match-patch'
// import { diff_match_patch as Dmp } from './helpers/dmp.js'

// const res = await pool.query(
//   'SELECT x.body FROM hafsql."TxComment" x WHERE author =$1 and permlink=$2 ORDER BY op_id ASC',
//   ['mahdiyari', 'hive-twitter-community']
// )

// 20s
// const test = async () => {
//   let original = res.rows[0].body
//   for (let i = 1; i < res.rowCount; i++) {
//     const [temp] = applyPatches(parsePatch(res.rows[i].body), original)
//     original = temp
//   }
//   // console.log(original)
// }

// 11s
// const test = async () => {
//   try {
//     const dmp = new DiffMatchPatch()
//     // let original = res.rows[0].body
//     // for (let i = 1; i < res.rowCount; i++) {
//     const patch = dmp.patch_fromText(p2)
//     const [temp] = dmp.patch_apply(patch, original)
//     // original = temp
//     // }
//     console.log(temp)
//     // console.log(original)
//   } catch {
//     console.log('didnt patch')
//   }
// }

// const original = `<center>![hivetwitter3.jpg](https://images.hive.blog/DQmUim2ktqCow2F2wtNKT6L2VUFARvH5B5JQs5dVGCrgsvB/hivetwitter3.jpg)</center>
// Short tweets.
// Max 280 characters.
// For longer tweets and threads use comments under your tweet post.
// (everything else just like twitter.com)

// Let's make it fun. Please follow the rules.

// Also looking for MODs to remove long blogs submitted to the community.`

// const p1 = `@@ -377,8 +377,47 @@
//  mmunity.
// +%0A%0Ahttps://hive.blog/created/hive-113882
// `

// const p2 = 'DELETED COMMENT'

// const test = async () => {
//   const dmp = new Dmp()
//   // const patch = dmp.patch_fromText(p1)
//   // const [temp] = dmp.patch_apply(patch, original)
//   // console.log(temp)
//   let original = res.rows[0].body
//   for (let i = 1; i < res.rowCount; i++) {
//     const patch = dmp.patch_fromText(res.rows[i].body)
//     const [temp] = dmp.patch_apply(patch, original)
//     original = temp
//   }
//   // console.log(original)
// }

// const nowTime = Date.now()
// for (let i = 0; i < 1; i++) {
//   test()
// }
// console.log((Date.now() - nowTime))
// const t = `
// 123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_\`abcdefghijklmnopqrstuvwxyz{|}~ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×
// ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽ
// žſƀƁƂƃƄƅƆƇƈƉƊƋƌƍƎƏƐƑƒƓƔƕƖƗƘƙƚƛƜƝƞƟƠơƢƣƤƥƦƧƨƩƪƫƬƭƮƯưƱƲƳƴƵƶƷƸƹƺƻƼƽƾƿǀǁǂǃǄǅǆǇǈǉǊǋǌǍǎǏǐǑǒǓǔǕǖǗǘǙǚǛǜǝǞǟǠǡǢǣǤǥǦǧǨǩǪǫǬǭǮǯǰǱǲǳǴǵǶǷǸǹǺǻǼǽǾǿȀȁȂȃȄȅȆȇȈȉȊȋȌȍȎȏȐȑȒȓȔȕȖȗȘșȚțȜȝȞȟȠȡȢȣ
// ȤȥȦȧȨȩȪȫȬȭȮȯȰȱȲȳȴȵȶȷȸȹȺȻȼȽȾȿɀɁɂɃɄɅɆɇɈɉɊɋɌɍɎɏɐɑɒɓɔɕɖɗɘəɚɛɜɝɞɟɠɡɢɣɤɥɦɧɨɩɪɫɬɭɮɯɰɱɲɳɴɵɶɷɸɹɺɻɼɽɾɿʀʁʂʃʄʅʆʇʈʉʊʋʌʍʎʏʐʑʒʓʔʕʖʗʘʙʚʛʜʝʞʟʠʡʢʣʤʥʦʧʨʩʪʫʬʭʮʯʰʱʲʳʴʵʶʷʸʹʺʻʼʽʾʿˀˁ˂˃˄˅ˆˇˈˉ
// ˊˋˌˍˎˏːˑ˒˓˔˕˖˗˘˙˚˛˜˝˞˟ˠˡˢˣˤ˥˦˧˨˩˪˫ˬ˭ˮ˯˰˱˲˳˴˵˶˷˸˹˺˻˼˽˾˿̀́ͰͱͲͳʹ͵Ͷͷ͸͹ͺͻͼͽ;Ϳ΀΁΂΃΄΅Ά·ΈΉΊ΋Ό΍ΎΏΐΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡ΢ΣΤΥΦΧΨΩΪΫάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώϏϐϑϒϓϔϕϖϗϘϙϚϛϜϝϞϟ
// ϠϡϢϣϤϥϦϧϨϩϪϫϬϭϮϯϰϱϲϳϴϵ϶ϷϸϹϺϻϼϽϾϿЀЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяѐёђѓєѕіїјљњћќѝўџѠѡѢѣѤѥѦѧѨѩѪѫѬѭѮѯѰѱѲѳѴѵѶѷѸѹѺѻѼѽѾѿҀҁ҂҃҄ҊҋҌ
// ҍҎҏҐґҒғҔҕҖҗҘҙҚқҜҝҞҟҠҡҢңҤҥҦҧҨҩҪҫҬҭҮүҰұҲҳҴҵҶҷҸҹҺһҼҽҾҿӀӁӂӃӄӅӆӇӈӉӊӋӌӍӎӏӐӑӒӓӔӕӖӗӘәӚӛӜӝӞӟӠӡӢӣӤӥӦӧӨөӪӫӬӭӮӯӰӱӲӳӴӵӶӷӸӹӺӻӼӽӾӿԀԁԂԃԄԅԆԇԈԉԊԋԌԍԎԏԐԑԒԓԔԕԖԗԘԙԚԛԜԝԞԟԠԡԢԣԤԥԦԧԨԩԪԫԬԭԮԯ԰ԱԲ
// ԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖ՗՘ՙ՚՛՜՝՞՟ՠաբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆևֈ։֊֋֌֍֎֏֐֑֒־ֿ׀ׁׂ׃ׅׄ׆ׇ׈׉׊׋׌׍׎׏אבגדהוזחטיךכלםמןנסעףפץצקרשת׫׬׭׮ׯװױײ׳״׵׶׷׸׹׺׻׼׽׾׿؆؇؈؉؊؋
// ،؍؎؏ؐؑ؛؝؞؟ؠءآأؤإئابةتثجحخدذرزسشصضطظعغػؼؽؾؿـفقكلمنهوىيًٌ٠١٢٣٤٥٦٧٨٩٪٫٬٭ٮٯٰٱٲٳٴٵٶٷٸٹٺٻټٽپٿڀځڂڃڄڅچڇڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙښڛڜڝڞڟڠڡڢڣڤڥڦڧڨکڪګڬڭڮگڰڱڲڳڴڵڶڷڸڹںڻڼڽھڿۀہۂۃۄۅۆۇۈۉۊۋیۍێۏېۑےۓ
// ۔ەۖۗ۞۟۠ۥۦۧۨ۩۪۫ۮۯ۰۱۲۳۴۵۶۷۸۹ۺۻۼ۽۾ۿ܀܁܂܃܄܅܆܇܈܉܊܋܌܍܎ܐܑܒܓܔܕܖܗܘܙܚܛܜܝܞܟܠܡܢܣܤܥܦܧܨܩܪܫܬܭܮܯܱܰ݋݌ݍݎݏݐݑݒݓݔݕݖݗݘݙݚݛݜݝݞݟݠݡݢݣݤݥݦݧݨݩݪݫݬݭݮݯݰݱݲݳݴݵݶݷݸݹݺݻݼݽݾݿހށނރބޅކއވމފދތލގޏސޑޒޓޔޕޖޗޘޙޚޛޜޝޞޟޠޡޢޣޤޥަާޱ޲޳
// ޴޵޶޷޺޸޹޻޼޽޾޿߀߁߂߃߄߅߆߇߈߉ߊߋߌߍߎߏߐߑߒߓߔߕߖߗߘߙߚߛߜߝߞߟߠߡߢߣߤߥߦߧߨߩߪ߫߬ߴߵ߶߷߸߹ߺ߻߼߽߾߿`

// console.log(pg.types.getTypeParser(pg.types.builtins.VARCHAR)(t))
// vwxyz{|}~ ¡¢£¤¥¦§¨

const data = '}~ ¡¢'
pool.query('UPDATE hafsql.sync_table SET table_name=$1 WHERE last_op_id=5')
