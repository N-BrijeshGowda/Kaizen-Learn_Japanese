/* Kaizen prototype role-plays. DRAFT: not yet reviewed by a Japanese speaker.
   24 conversations in four tiers of six (Starter, Easy, Medium, Challenge). Each gets longer and uses more language.
   Line format:  who|kana|romaji|English   (who is "them" for the colleague or "you") */
(function () {
  const RP = (t, scene, rows) => ({
    t, scene,
    lines: rows.map(r => { const [w, k, ro, en] = r.split('|'); return { w, k, ro, en }; })
  });

  window.KAIZEN_ROLEPLAYS = [
    /* ---- Starter: 3 to 4 short lines ---- */
    RP('Good morning', 'You walk into the office and meet a colleague.', [
      'them|おはようございます|ohayoo gozaimasu|Good morning',
      'you|おはようございます|ohayoo gozaimasu|Good morning',
      'them|きょうもよろしくおねがいします|kyoo mo yoroshiku onegai shimasu|Let\'s work well together again today',
      'you|よろしくおねがいします|yoroshiku onegai shimasu|Likewise, nice to work with you']),
    RP('Saying thanks', 'A colleague hands you something you asked for.', [
      'them|これ、どうぞ|kore, doozo|Here you go',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you',
      'them|いえいえ|ie ie|It\'s nothing']),
    RP('Saying sorry', 'You bump into a colleague\'s desk.', [
      'you|すみません|sumimasen|Sorry',
      'them|だいじょうぶですよ|daijoobu desu yo|It\'s okay',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you']),
    RP('Offering tea', 'A colleague brings tea around the office.', [
      'them|おちゃ、いかがですか|ocha, ikaga desu ka|Would you like some tea?',
      'you|はい、おねがいします|hai, onegai shimasu|Yes, please',
      'them|はい、どうぞ|hai, doozo|Here you go',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you']),
    RP('Leaving for the day', 'It is evening. You are heading home before others.', [
      'you|おさきにしつれいします|osaki ni shitsuree shimasu|Excuse me for leaving before you',
      'them|おつかれさまでした|otsukaresama deshita|Thanks for your work today',
      'you|おつかれさまでした|otsukaresama deshita|Thanks for your work too',
      'them|また、あした|mata, ashita|See you tomorrow']),
    RP('Ordering coffee', 'A colleague is making a coffee run.', [
      'them|コーヒーとおちゃ、どちらがいいですか|koohii to ocha, dochira ga ii desu ka|Coffee or tea, which would you like?',
      'you|コーヒーをおねがいします|koohii o onegai shimasu|Coffee, please',
      'them|はい、どうぞ|hai, doozo|Here you go',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you']),

    /* ---- Easy: 4 lines, short questions and answers ---- */
    RP('Meeting someone new', 'A new colleague joins your team today.', [
      'them|はじめまして。たなかです|hajimemashite. Tanaka desu|Nice to meet you. I am Tanaka',
      'you|はじめまして。プリヤです|hajimemashite. Puriya desu|Nice to meet you. I am Priya',
      'them|よろしくおねがいします|yoroshiku onegai shimasu|Pleased to work with you',
      'you|よろしくおねがいします|yoroshiku onegai shimasu|Pleased to work with you too']),
    RP('Finding the meeting room', 'You are lost on a new floor.', [
      'you|すみません、かいぎしつはどこですか|sumimasen, kaigishitsu wa doko desu ka|Excuse me, where is the meeting room?',
      'them|あそこです|asoko desu|It\'s over there',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you']),
    RP('Lunch invitation', 'It is almost noon.', [
      'them|ランチ、いっしょにどうですか|ranchi, issho ni doo desu ka|How about lunch together?',
      'you|いいですね|ii desu ne|Sounds good',
      'them|じゃあ、じゅうにじにいきましょう|jaa, juuniji ni ikimashoo|Then let\'s go at twelve',
      'you|はい、わかりました|hai, wakarimashita|Yes, understood']),
    RP('Didn\'t catch that', 'A colleague tells you something fast.', [
      'them|あしたのかいぎはごごさんじです|ashita no kaigi wa gogo sanji desu|Tomorrow\'s meeting is at 3 pm',
      'you|すみません、もういちどおねがいします|sumimasen, moo ichido onegai shimasu|Sorry, once more please',
      'them|ごごさんじです|gogo sanji desu|It\'s at 3 pm',
      'you|わかりました、ありがとうございます|wakarimashita, arigatoo gozaimasu|Understood, thank you']),
    RP('Asking the time', 'You have lost track of time at your desk.', [
      'you|すみません、いまなんじですか|sumimasen, ima nanji desu ka|Excuse me, what time is it now?',
      'them|さんじです|sanji desu|It\'s three o\'clock',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you',
      'them|いえいえ|ie ie|It\'s nothing']),
    RP('Borrowing a pen', 'You need a pen in a meeting.', [
      'you|すみません、ペンをかしてください|sumimasen, pen o kashite kudasai|Excuse me, please lend me a pen',
      'them|はい、どうぞ|hai, doozo|Sure, here you go',
      'you|ありがとうございます。すぐかえします|arigatoo gozaimasu. sugu kaeshimasu|Thank you. I will return it right away',
      'them|だいじょうぶですよ|daijoobu desu yo|No hurry']),

    /* ---- Medium: 4 to 5 lines, small talk and everyday work ---- */
    RP('Weekend small talk', 'Monday morning, by the coffee machine.', [
      'them|しゅうまつはなにをしましたか|shuumatsu wa nani o shimashita ka|What did you do on the weekend?',
      'you|ともだちにあいました|tomodachi ni aimashita|I met a friend',
      'them|いいですね|ii desu ne|Nice',
      'you|たのしかったです|tanoshikatta desu|It was fun']),
    RP('Hot weather', 'A hot afternoon in the office kitchen.', [
      'them|きょうはあついですね|kyoo wa atsui desu ne|It\'s hot today, isn\'t it?',
      'you|そうですね。とてもあついです|soo desu ne. totemo atsui desu|It is. Very hot',
      'them|つめたいおちゃをのみませんか|tsumetai ocha o nomimasen ka|Shall we have some cold tea?',
      'you|いいですね。ありがとうございます|ii desu ne. arigatoo gozaimasu|Sounds good. Thank you']),
    RP('Asking for a favour', 'You need a document copied before a meeting.', [
      'you|すみません、ちょっといいですか|sumimasen, chotto ii desu ka|Excuse me, do you have a moment?',
      'them|はい、なんですか|hai, nan desu ka|Yes, what is it?',
      'you|コピーをおねがいできますか|kopii o onegai dekimasu ka|Could I ask you to make a copy?',
      'them|はい、わかりました|hai, wakarimashita|Yes, understood',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you']),
    RP('Running late', 'You will miss the start of a meeting.', [
      'you|すみません、すこしおくれます|sumimasen, sukoshi okuremasu|Sorry, I will be a little late',
      'them|わかりました。なんぷんぐらいですか|wakarimashita. nanpun gurai desu ka|Understood. About how many minutes?',
      'you|じゅっぷんぐらいです|juppun gurai desu|About ten minutes',
      'them|だいじょうぶです。まっています|daijoobu desu. matte imasu|That\'s fine. I\'ll wait',
      'you|ありがとうございます|arigatoo gozaimasu|Thank you']),
    RP('Checking a deadline', 'A colleague needs a document from you.', [
      'them|しりょうはいつまでですか|shiryoo wa itsu made desu ka|By when is the document due?',
      'you|あしたのごごさんじまでです|ashita no gogo sanji made desu|By 3 pm tomorrow',
      'them|わかりました。がんばります|wakarimashita. ganbarimasu|Understood. I\'ll do my best',
      'you|おねがいします|onegai shimasu|Thank you, please do']),
    RP('Looking tired', 'A colleague notices you after a long day.', [
      'them|すこしおつかれですね|sukoshi otsukare desu ne|You look a bit tired',
      'you|はい、きのうおそくまではたらきました|hai, kinoo osoku made hatarakimashita|Yes, I worked late yesterday',
      'them|だいじょうぶですか|daijoobu desu ka|Are you okay?',
      'you|はい、だいじょうぶです。コーヒーをのみます|hai, daijoobu desu. koohii o nomimasu|Yes, I\'m fine. I\'ll have a coffee',
      'them|むりしないでくださいね|muri shinaide kudasai ne|Please don\'t push yourself']),

    /* ---- Challenge: 4 to 6 lines, longer sentences and polite refusals ---- */
    RP('Changing a meeting by phone', 'You call a colleague to move tomorrow\'s meeting.', [
      'them|もしもし、たなかです|moshi moshi, Tanaka desu|Hello, this is Tanaka',
      'you|もしもし、プリヤです。あしたのかいぎのじかんをかえたいです|moshi moshi, Puriya desu. ashita no kaigi no jikan o kaetai desu|Hello, this is Priya. I would like to change tomorrow\'s meeting time',
      'them|なんじがいいですか|nanji ga ii desu ka|What time is good for you?',
      'you|ごごにじはどうですか|gogo niji wa doo desu ka|How about 2 pm?',
      'them|だいじょうぶです|daijoobu desu|That works',
      'you|よろしくおねがいします|yoroshiku onegai shimasu|Thank you, I appreciate it']),
    RP('Declining politely', 'A colleague invites you out, but you cannot go.', [
      'them|こんばん、のみにいきませんか|konban, nomi ni ikimasen ka|Shall we go for a drink tonight?',
      'you|ありがとうございます。でも、きょうはちょっと|arigatoo gozaimasu. demo, kyoo wa chotto|Thank you. But today is a bit difficult',
      'them|そうですか。じゃあ、またこんど|soo desu ka. jaa, mata kondo|I see. Then another time',
      'you|はい、こんどぜひ|hai, kondo zehi|Yes, definitely next time']),
    RP('A colleague\'s birthday', 'It is a teammate\'s birthday.', [
      'them|きょうはわたしのたんじょうびです|kyoo wa watashi no tanjoobi desu|Today is my birthday',
      'you|おたんじょうびおめでとうございます|otanjoobi omedetoo gozaimasu|Happy birthday',
      'them|ありがとうございます|arigatoo gozaimasu|Thank you',
      'you|みんなでケーキをたべませんか|minna de keeki o tabemasen ka|Shall we all have cake together?',
      'them|いいですね|ii desu ne|Sounds good']),
    RP('Asking for an opinion', 'You are discussing a plan with a colleague.', [
      'you|このあんについて、どうおもいますか|kono an ni tsuite, doo omoimasu ka|What do you think about this plan?',
      'them|いいとおもいます。でも、じかんがすこしたりません|ii to omoimasu. demo, jikan ga sukoshi tarimasen|I think it\'s good. But time is a little short',
      'you|そうですね。もうすこしかんがえましょう|soo desu ne. moo sukoshi kangaemashoo|True. Let\'s think a bit more',
      'them|はい、あしたまたはなしましょう|hai, ashita mata hanashimashoo|Yes, let\'s talk again tomorrow',
      'you|わかりました。よろしくおねがいします|wakarimashita. yoroshiku onegai shimasu|Understood. Thank you']),
    RP('A computer problem', 'Your computer will not open a file.', [
      'you|すみません、パソコンがうごきません|sumimasen, pasokon ga ugokimasen|Excuse me, my computer isn\'t working',
      'them|どうしましたか|doo shimashita ka|What happened?',
      'you|がめんがひらきません|gamen ga hirakimasen|The screen won\'t open',
      'them|ちょっとみせてください。ああ、すぐなおります|chotto misete kudasai. aa, sugu naorimasu|Let me take a look. Oh, it will be fixed soon',
      'you|たすかります。ありがとうございます|tasukarimasu. arigatoo gozaimasu|That helps. Thank you',
      'them|いえいえ|ie ie|It\'s nothing']),
    RP('Planning a team lunch', 'You are organising lunch for next week.', [
      'them|らいしゅう、チームでランチにいきませんか|raishuu, chiimu de ranchi ni ikimasen ka|Shall we have a team lunch next week?',
      'you|いいですね。なにがたべたいですか|ii desu ne. nani ga tabetai desu ka|Sounds good. What would you like to eat?',
      'them|わしょくはどうですか|washoku wa doo desu ka|How about Japanese food?',
      'you|さんせいです|sansei desu|I agree',
      'them|じゃあ、かようびのじゅうにじはどうですか|jaa, kayoobi no juuniji wa doo desu ka|Then how about Tuesday at twelve?',
      'you|だいじょうぶです。たのしみです|daijoobu desu. tanoshimi desu|That works. I\'m looking forward to it'])
  ];
})();
