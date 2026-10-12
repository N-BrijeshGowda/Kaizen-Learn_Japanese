/* Kaizen prototype content. DRAFT: not yet reviewed by a Japanese speaker.
   Row format:  kana|romaji|English|tip|part,romaji,meaning;part,romaji,meaning   (parts are optional) */
(function () {
  const L = (id, name, kind, sub, sets) => ({
    id, name, kind, sub,
    sets: sets.map(([n, rows]) => ({
      name: n,
      items: rows.map(r => {
        const [k, ro, en, note, parts] = r.split('|');
        return { k, ro, en, note, parts: parts ? parts.split(';').map(p => p.split(',')) : null };
      })
    }))
  });

  window.KAIZEN_LEVELS = [
    L(1, 'First words', 'Word', 'Single words you will hear all day.', [
      ['Everyday basics', [
        'はい|hai|Yes|Also used to say "I am listening" while someone talks.',
        'いいえ|iie|No|Softer than a flat no. Often followed by a smile.',
        'ありがとう|arigatoo|Thanks|Casual. Level 2 makes it polite.',
        'すみません|sumimasen|Excuse me / sorry|Works for getting attention and for apologising.',
        'おねがいします|onegai shimasu|Please (asking for something)|Say it when you ask for something or hand a task over.'
      ]],
      ['Greetings', [
        'おはよう|ohayoo|Good morning|Casual. Level 2 has the polite version.',
        'おつかれさま|otsukaresama|Good work (office greeting)|The office word. Say it when you pass a colleague.',
        'こんにちは|konnichiwa|Hello (daytime)|Fine for visitors and people you do not know well.',
        'こんばんは|konbanwa|Good evening|Used after dark.',
        'どうぞ|doozo|Please, go ahead / here you are|Say it when offering something or letting someone go first.'
      ]],
      ['Understanding', [
        'わかりました|wakarimashita|I understand / understood|Shows you got the message.',
        'わかりません|wakarimasen|I don\'t understand|Honest and useful. Nobody minds.',
        'そうです|soo desu|That\'s right|Agree with someone by saying this.',
        'だいじょうぶ|daijoobu|OK / fine|Means "no problem" or "I\'m fine".',
        'ちょっと|chotto|A little / a moment|Softens requests. A lot of Japanese starts with it.'
      ]],
      ['Office things', [
        'かいぎ|kaigi|Meeting|You will hear this one every day.',
        'ランチ|ranchi|Lunch|From the English word, so it is easy.',
        'コーヒー|koohii|Coffee|Hold the "oo" a little longer.',
        'おちゃ|ocha|Tea|Green tea is the default.',
        'トイレ|toire|Restroom|Also from English.'
      ]],
      ['Time and people', [
        'きょう|kyoo|Today|Two beats on "kyoo".',
        'あした|ashita|Tomorrow|Used for "see you tomorrow".',
        'いま|ima|Now|Short and sharp.',
        'ともだち|tomodachi|Friend|Colleagues you get on with count.',
        'さん|san|Mr / Ms (added to a name)|Say it after a name: Tanaka-san. Never use it for yourself.'
      ]]
    ]),

    L(2, 'Words in small phrases', 'Phrase', 'The same words, joined into short phrases.', [
      ['Polite basics', [
        'おはようございます|ohayoo gozaimasu|Good morning (polite)|Safe with everyone at work.|おはよう,ohayoo,good morning;ございます,gozaimasu,polite ending',
        'ありがとうございます|arigatoo gozaimasu|Thank you (polite)|Use it with managers and clients.|ありがとう,arigatoo,thanks;ございます,gozaimasu,polite ending',
        'ありがとうございました|arigatoo gozaimashita|Thank you (for what you did)|Past tense: the favour is finished.|ありがとう,arigatoo,thanks;ございました,gozaimashita,polite ending (past)',
        'おつかれさまです|otsukaresama desu|Hello / thanks for your work|Used all day when you pass someone.|おつかれさま,otsukaresama,good work;です,desu,is (polite)',
        'おつかれさまでした|otsukaresama deshita|Thanks for today\'s work|Said when someone leaves or a task ends.|おつかれさま,otsukaresama,good work;でした,deshita,was (polite)'
      ]],
      ['Understanding', [
        'はい、わかりました|hai, wakarimashita|Yes, understood|Shows you got it.|はい,hai,yes;わかりました,wakarimashita,I understood',
        'いいえ、わかりません|iie, wakarimasen|No, I don\'t understand|Plain and polite.|いいえ,iie,no;わかりません,wakarimasen,I don\'t understand',
        'もういちどおねがいします|moo ichido onegai shimasu|Once more, please|Your best tool when you missed something.|もういちど,moo ichido,once more;おねがいします,onegai shimasu,please',
        'ゆっくりおねがいします|yukkuri onegai shimasu|Slowly, please|Ask someone to slow down.|ゆっくり,yukkuri,slowly;おねがいします,onegai shimasu,please',
        'ちょっとまってください|chotto matte kudasai|Please wait a moment|Handy when you need a second to think.|ちょっと,chotto,a moment;まってください,matte kudasai,please wait'
      ]],
      ['Please and sorry', [
        'すみません、おねがいします|sumimasen, onegai shimasu|Excuse me, please|Gets someone\'s attention politely.|すみません,sumimasen,excuse me;おねがいします,onegai shimasu,please',
        'しつれいします|shitsuree shimasu|Excuse me (entering or leaving)|Say it when you walk into a room or leave one.|しつれい,shitsuree,excuse;します,shimasu,I do',
        'だいじょうぶです|daijoobu desu|I\'m fine / it\'s okay|Also a polite way to say no thanks.|だいじょうぶ,daijoobu,okay;です,desu,is (polite)',
        'そうですね|soo desu ne|That\'s right, isn\'t it|A friendly way to agree.|そう,soo,like that;ですね,desu ne,isn\'t it',
        'どうぞ、よろしくおねがいします|doozo, yoroshiku onegai shimasu|Nice to meet you|Said when meeting someone for the first time.|どうぞ,doozo,please;よろしく,yoroshiku,kindly;おねがいします,onegai shimasu,please'
      ]],
      ['Office items', [
        'コーヒーをどうぞ|koohii o doozo|Here\'s some coffee|Handing someone a drink.|コーヒー,koohii,coffee;を,o,marks the thing;どうぞ,doozo,here you are',
        'おちゃをおねがいします|ocha o onegai shimasu|Tea, please|Swap in any drink.|おちゃ,ocha,tea;を,o,marks the thing;おねがいします,onegai shimasu,please',
        'トイレはどこですか|toire wa doko desu ka|Where is the restroom?|Put any place before はどこですか.|トイレ,toire,restroom;は,wa,topic marker;どこですか,doko desu ka,where is it',
        'かいぎはなんじですか|kaigi wa nanji desu ka|What time is the meeting?|Swap in any event.|かいぎ,kaigi,meeting;は,wa,topic marker;なんじですか,nanji desu ka,what time is it',
        'いまなんじですか|ima nanji desu ka|What time is it now?|Handy near the end of the day.|いま,ima,now;なんじですか,nanji desu ka,what time is it'
      ]],
      ['Time and people', [
        'きょうはあついです|kyoo wa atsui desu|It\'s hot today|The classic opener.|きょう,kyoo,today;は,wa,topic marker;あついです,atsui desu,is hot',
        'またあした|mata ashita|See you tomorrow|A friendly goodbye.|また,mata,again;あした,ashita,tomorrow',
        'あしたもよろしくおねがいします|ashita mo yoroshiku onegai shimasu|Looking forward to tomorrow too|A warm way to end the day.|あした,ashita,tomorrow;も,mo,also;よろしくおねがいします,yoroshiku onegai shimasu,please treat me well',
        'たなかさん、おはようございます|tanaka-san, ohayoo gozaimasu|Good morning, Tanaka-san|Add the name and さん to make it personal.|たなかさん,tanaka-san,Mr/Ms Tanaka;おはようございます,ohayoo gozaimasu,good morning (polite)',
        'ともだちです|tomodachi desu|(This is) a friend|Use it to introduce someone.|ともだち,tomodachi,friend;です,desu,is (polite)'
      ]]
    ]),

    L(3, 'Short sentences', 'Sentence', 'Short, useful sentences for the office.', [
      ['Leaving and asking', [
        'おさきにしつれいします|osaki ni shitsuree shimasu|Excuse me for leaving before you|Say it when you leave before others. Skipping it can sound cold.|おさきに,osaki ni,before you;しつれいします,shitsuree shimasu,excuse me',
        'ランチ、いっしょにどうですか|ranchi, issho ni doo desu ka|How about lunch together?|An easy way to invite someone.|ランチ,ranchi,lunch;いっしょに,issho ni,together;どうですか,doo desu ka,how about it',
        'コーヒーをおねがいします|koohii o onegai shimasu|Coffee, please|Swap コーヒー for any drink or item.|コーヒー,koohii,coffee;を,o,marks the thing;おねがいします,onegai shimasu,please',
        'かいぎしつはどこですか|kaigishitsu wa doko desu ka|Where is the meeting room?|Put any place before はどこですか.|かいぎしつ,kaigishitsu,meeting room;は,wa,topic marker;どこですか,doko desu ka,where is it',
        'だいじょうぶですか|daijoobu desu ka|Are you okay?|A kind thing to ask a tired colleague.|だいじょうぶ,daijoobu,okay;ですか,desu ka,is it?'
      ]],
      ['Requests', [
        'これをおねがいします|kore o onegai shimasu|This one, please|Point at it and say this.|これ,kore,this;を,o,marks the thing;おねがいします,onegai shimasu,please',
        'もうすこしゆっくりおねがいします|moo sukoshi yukkuri onegai shimasu|A little slower, please|Polite way to slow someone down.|もうすこし,moo sukoshi,a little more;ゆっくり,yukkuri,slowly;おねがいします,onegai shimasu,please',
        'ちょっとてつだってください|chotto tetsudatte kudasai|Please help me a bit|Softened with ちょっと.|ちょっと,chotto,a bit;てつだって,tetsudatte,help;ください,kudasai,please',
        'メールをおくってください|meeru o okutte kudasai|Please send me an email|Swap メール for any item.|メール,meeru,email;を,o,marks the thing;おくってください,okutte kudasai,please send',
        'こちらにきてください|kochira ni kite kudasai|Please come this way|Used when guiding someone.|こちらに,kochira ni,to this way;きてください,kite kudasai,please come'
      ]],
      ['Questions', [
        'これはなんですか|kore wa nan desu ka|What is this?|The most useful question when learning.|これ,kore,this;は,wa,topic marker;なんですか,nan desu ka,what is it',
        'じかんはありますか|jikan wa arimasu ka|Do you have time?|Good before asking for a favour.|じかん,jikan,time;は,wa,topic marker;ありますか,arimasu ka,do you have',
        'だれですか|dare desu ka|Who is it?|Short and handy.|だれ,dare,who;ですか,desu ka,is it?',
        'いくらですか|ikura desu ka|How much is it?|Use it at the cafe or shop.|いくら,ikura,how much;ですか,desu ka,is it?',
        'どうしましたか|doo shimashita ka|What happened?|Ask it when someone looks worried.|どう,doo,how;しましたか,shimashita ka,did you do'
      ]],
      ['Replies', [
        'はい、だいじょうぶです|hai, daijoobu desu|Yes, that\'s fine|Easy agreement.|はい,hai,yes;だいじょうぶです,daijoobu desu,it\'s fine',
        'いいえ、けっこうです|iie, kekkoo desu|No, thank you|A polite way to decline.|いいえ,iie,no;けっこうです,kekkoo desu,that\'s enough',
        'すみません、わかりません|sumimasen, wakarimasen|Sorry, I don\'t understand|Say it, then ask for it again.|すみません,sumimasen,sorry;わかりません,wakarimasen,I don\'t understand',
        'もちろんです|mochiron desu|Of course|A confident yes.|もちろん,mochiron,of course;です,desu,is (polite)',
        'いいですよ|ii desu yo|Sure, that\'s fine|Friendly and relaxed.|いい,ii,good;ですよ,desu yo,friendly emphasis'
      ]],
      ['Feelings', [
        'たのしいです|tanoshii desu|It\'s fun|Say it about a lunch, a trip, a lesson.|たのしい,tanoshii,fun;です,desu,is (polite)',
        'おいしいです|oishii desu|It\'s delicious|Said about food and drink.|おいしい,oishii,delicious;です,desu,is (polite)',
        'いそがしいです|isogashii desu|I\'m busy|Explains why you cannot chat.|いそがしい,isogashii,busy;です,desu,is (polite)',
        'つかれました|tsukaremashita|I\'m tired|Past tense, because tiredness has built up.|つかれ,tsukare,tired;ました,mashita,did (past)',
        'うれしいです|ureshii desu|I\'m happy|A warm thing to say.|うれしい,ureshii,happy;です,desu,is (polite)'
      ]]
    ]),

    L(4, 'Small talk', 'Sentence', 'Sentences for friendly office chat.', [
      ['Weather and food', [
        'きょうはあついですね|kyoo wa atsui desu ne|It\'s hot today, isn\'t it?|Weather is the classic small-talk opener.|きょう,kyoo,today;あつい,atsui,hot;ですね,desu ne,isn\'t it',
        'きょうはさむいですね|kyoo wa samui desu ne|It\'s cold today, isn\'t it?|Swap あつい for さむい.|きょう,kyoo,today;さむい,samui,cold;ですね,desu ne,isn\'t it',
        'あめですね|ame desu ne|It\'s raining, isn\'t it?|Only two words.|あめ,ame,rain;ですね,desu ne,isn\'t it',
        'ここのランチ、おいしいですね|koko no ranchi, oishii desu ne|The lunch here is tasty, isn\'t it?|ですね invites the other person to agree.|ここの,koko no,of this place;おいしい,oishii,tasty;ですね,desu ne,isn\'t it',
        'このコーヒー、おいしいですね|kono koohii, oishii desu ne|This coffee is good, isn\'t it?|Perfect by the coffee machine.|この,kono,this;コーヒー,koohii,coffee;おいしいですね,oishii desu ne,it\'s tasty'
      ]],
      ['Compliments', [
        'そのシャツ、すてきですね|sono shatsu, suteki desu ne|That shirt is nice|A friendly compliment.|そのシャツ,sono shatsu,that shirt;すてき,suteki,nice;ですね,desu ne,isn\'t it',
        'いいかばんですね|ii kaban desu ne|That\'s a nice bag|Swap かばん for anything.|いい,ii,good;かばん,kaban,bag;ですね,desu ne,isn\'t it',
        'じょうずですね|joozu desu ne|You\'re good at it|Praise a skill.|じょうず,joozu,skilled;ですね,desu ne,isn\'t it',
        'にほんごがじょうずですね|nihongo ga joozu desu ne|Your Japanese is good|Teammates will love hearing it.|にほんご,nihongo,Japanese;が,ga,marks the subject;じょうず,joozu,skilled;ですね,desu ne,isn\'t it',
        'すごいですね|sugoi desu ne|Wow, that\'s impressive|A great reaction to good news.|すごい,sugoi,amazing;ですね,desu ne,isn\'t it'
      ]],
      ['Weekend and plans', [
        'しゅうまつはなにをしましたか|shuumatsu wa nani o shimashita ka|What did you do on the weekend?|Perfect for Monday morning.|しゅうまつ,shuumatsu,weekend;なに,nani,what;しましたか,shimashita ka,did you do',
        'しゅうまつはなにをしますか|shuumatsu wa nani o shimasu ka|What will you do this weekend?|The Friday version.|しゅうまつ,shuumatsu,weekend;なに,nani,what;しますか,shimasu ka,will you do',
        'ともだちにあいました|tomodachi ni aimashita|I met a friend|A typical reply.|ともだちに,tomodachi ni,a friend;あいました,aimashita,met',
        'えいがをみました|eiga o mimashita|I watched a movie|Swap えいが for anything.|えいが,eiga,movie;を,o,marks the thing;みました,mimashita,watched',
        'うちにいました|uchi ni imashita|I stayed at home|A calm weekend.|うちに,uchi ni,at home;いました,imashita,was there'
      ]],
      ['About yourself', [
        'にほんごをべんきょうしています|nihongo o benkyoo shite imasu|I\'m studying Japanese|Colleagues will be happy to hear it.|にほんご,nihongo,Japanese;べんきょう,benkyoo,study;しています,shite imasu,am doing',
        'にほんごはすこしだけはなせます|nihongo wa sukoshi dake hanasemasu|I can only speak a little Japanese|Sets expectations kindly.|にほんご,nihongo,Japanese;すこしだけ,sukoshi dake,only a little;はなせます,hanasemasu,can speak',
        'わたしはまだはじめたばかりです|watashi wa mada hajimeta bakari desu|I\'ve only just started|Honest and charming.|わたしは,watashi wa,as for me;まだ,mada,still;はじめたばかりです,hajimeta bakari desu,have just started',
        'にほんごがすきです|nihongo ga suki desu|I like Japanese|Short and true.|にほんご,nihongo,Japanese;が,ga,marks the subject;すきです,suki desu,like',
        'まいにちれんしゅうしています|mainichi renshuu shite imasu|I practise every day|Say it with your streak in mind.|まいにち,mainichi,every day;れんしゅう,renshuu,practice;しています,shite imasu,am doing'
      ]],
      ['Feelings', [
        'ちょっとつかれました|chotto tsukaremashita|I\'m a little tired|Softened with ちょっと.|ちょっと,chotto,a little;つかれました,tsukaremashita,got tired',
        'ねむいです|nemui desu|I\'m sleepy|A Monday classic.|ねむい,nemui,sleepy;です,desu,is (polite)',
        'おなかがすきました|onaka ga sukimashita|I\'m hungry|Said before lunch.|おなか,onaka,stomach;が,ga,marks the subject;すきました,sukimashita,became empty',
        'たのしかったです|tanoshikatta desu|It was fun|Past tense of たのしい.|たのしかった,tanoshikatta,was fun;です,desu,is (polite)',
        'たのしみです|tanoshimi desu|I\'m looking forward to it|Good for upcoming events.|たのしみ,tanoshimi,looking forward;です,desu,is (polite)'
      ]]
    ]),

    L(5, 'Longer sentences', 'Sentence', 'Longer sentences, close to real conversation.', [
      ['Asking for help', [
        'ゆっくりはなしてもらえますか|yukkuri hanashite moraemasu ka|Could you speak slowly?|Polite way to slow someone down.|ゆっくり,yukkuri,slowly;はなして,hanashite,speak;もらえますか,moraemasu ka,could you',
        'もういちどいってもらえますか|moo ichido itte moraemasu ka|Could you say that again?|More polite than もういちどおねがいします.|もういちど,moo ichido,once more;いって,itte,say;もらえますか,moraemasu ka,could you',
        'これはにほんごでなんといいますか|kore wa nihongo de nan to iimasu ka|How do you say this in Japanese?|Your best learning question.|これは,kore wa,as for this;にほんごで,nihongo de,in Japanese;なんといいますか,nan to iimasu ka,what do you call it',
        'ちょっとおしえてもらえますか|chotto oshiete moraemasu ka|Could you teach me something?|A friendly request for help.|ちょっと,chotto,a bit;おしえて,oshiete,teach;もらえますか,moraemasu ka,could you',
        'おてすうですが、これをおねがいできますか|otesuu desu ga, kore o onegai dekimasu ka|Sorry to trouble you, but could you do this?|A very polite way to ask for help.|おてすうですが,otesuu desu ga,sorry to trouble you;これを,kore o,this;おねがいできますか,onegai dekimasu ka,could I ask you'
      ]],
      ['Meetings', [
        'らいしゅうのかいぎはなんじからですか|raishuu no kaigi wa nanji kara desu ka|What time does next week\'s meeting start?|Swap in any event for かいぎ.|らいしゅうの,raishuu no,of next week;かいぎは,kaigi wa,as for the meeting;なんじからですか,nanji kara desu ka,from what time',
        'かいぎはなんじにおわりますか|kaigi wa nanji ni owarimasu ka|What time does the meeting end?|Useful for planning your day.|かいぎは,kaigi wa,as for the meeting;なんじに,nanji ni,at what time;おわりますか,owarimasu ka,does it end',
        'あしたのかいぎにでますか|ashita no kaigi ni demasu ka|Will you attend tomorrow\'s meeting?|でます means "to attend".|あしたの,ashita no,of tomorrow;かいぎに,kaigi ni,the meeting;でますか,demasu ka,will you attend',
        'しりょうをおくってもらえますか|shiryoo o okutte moraemasu ka|Could you send me the materials?|Common in office life.|しりょう,shiryoo,materials;を,o,marks the thing;おくって,okutte,send;もらえますか,moraemasu ka,could you',
        'かいぎしつをよやくしました|kaigishitsu o yoyaku shimashita|I booked the meeting room|Past tense report.|かいぎしつ,kaigishitsu,meeting room;を,o,marks the thing;よやくしました,yoyaku shimashita,booked'
      ]],
      ['Lunch and invitations', [
        'いっしょにランチにいきませんか|issho ni ranchi ni ikimasen ka|Would you like to go to lunch together?|ませんか is a gentle invitation.|いっしょに,issho ni,together;ランチに,ranchi ni,to lunch;いきませんか,ikimasen ka,won\'t you go',
        'なにをたべますか|nani o tabemasu ka|What will you eat?|Ask it at the restaurant door.|なに,nani,what;を,o,marks the thing;たべますか,tabemasu ka,will you eat',
        'わたしはラーメンにします|watashi wa raamen ni shimasu|I\'ll have ramen|Swap in any dish.|わたしは,watashi wa,as for me;ラーメン,raamen,ramen;にします,ni shimasu,I\'ll choose',
        'ここのランチはおすすめですか|koko no ranchi wa osusume desu ka|Is the lunch here recommended?|Ask before you order.|ここの,koko no,of this place;ランチは,ranchi wa,as for lunch;おすすめですか,osusume desu ka,is it recommended',
        'おさきにどうぞ|osaki ni doozo|After you / go ahead|Say it at doors and lifts.|おさきに,osaki ni,before me;どうぞ,doozo,please'
      ]],
      ['Work talk', [
        'きのうはおそくまでざんぎょうしました|kinoo wa osoku made zangyoo shimashita|I worked overtime until late yesterday|Past tense with ました.|きのう,kinoo,yesterday;おそくまで,osoku made,until late;ざんぎょうしました,zangyoo shimashita,worked overtime',
        'いまいそがしいですか|ima isogashii desu ka|Are you busy now?|Ask before you interrupt.|いま,ima,now;いそがしい,isogashii,busy;ですか,desu ka,is it?',
        'しごとはどうですか|shigoto wa doo desu ka|How is work going?|A friendly check-in.|しごと,shigoto,work;は,wa,topic marker;どうですか,doo desu ka,how is it',
        'しめきりはいつですか|shimekiri wa itsu desu ka|When is the deadline?|Always worth asking.|しめきり,shimekiri,deadline;は,wa,topic marker;いつですか,itsu desu ka,when is it',
        'もうすぐおわります|moo sugu owarimasu|It\'ll be done soon|Reassures a colleague who is waiting.|もうすぐ,moo sugu,soon;おわります,owarimasu,will finish'
      ]],
      ['Conversation', [
        'にほんごではなすのはたのしいです|nihongo de hanasu no wa tanoshii desu|Speaking in Japanese is fun|Say it and you will mean it by now.|にほんごで,nihongo de,in Japanese;はなすのは,hanasu no wa,speaking;たのしいです,tanoshii desu,is fun',
        'にほんごでかいわしたいです|nihongo de kaiwa shitai desu|I want to have conversations in Japanese|A goal worth saying aloud.|にほんごで,nihongo de,in Japanese;かいわ,kaiwa,conversation;したいです,shitai desu,want to do',
        'まちがえてもだいじょうぶですか|machigaete mo daijoobu desu ka|Is it okay if I make mistakes?|The answer is always yes.|まちがえても,machigaete mo,even if I err;だいじょうぶですか,daijoobu desu ka,is it okay',
        'おしえてくれてありがとうございます|oshiete kurete arigatoo gozaimasu|Thank you for teaching me|Say it after any lesson.|おしえてくれて,oshiete kurete,for teaching me;ありがとうございます,arigatoo gozaimasu,thank you (polite)',
        'これからもよろしくおねがいします|kore kara mo yoroshiku onegai shimasu|Please keep working with me|A warm way to close a conversation.|これからも,kore kara mo,from now on too;よろしくおねがいします,yoroshiku onegai shimasu,please treat me well'
      ]]
    ])
  ];
})();
