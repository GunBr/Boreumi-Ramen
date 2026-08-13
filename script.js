(() => {
  "use strict";

  document.title = "보름이의 라면포차 V0.26.3";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const UrlParams = new URLSearchParams(location.search);
  const IsQA = UrlParams.has("qa");
  const IsDev = UrlParams.has("dev") && !IsQA;
  const PreviewLevel = Math.max(0, Math.min(5, Math.floor(Number(UrlParams.get("level")) || 0)));
  const PreviewDay = Math.max(0, Math.floor(Number(UrlParams.get("day")) || 0));
  const SaveKey = IsQA ? "boreumi-ramen-v026-qa" : IsDev ? "boreumi-ramen-v026-dev" : "boreumi-ramen-v026";
  const BackupKey = IsQA ? "boreumi-ramen-v026-backup-qa" : IsDev ? "boreumi-ramen-v026-backup-dev" : "boreumi-ramen-v026-backup";
  const AudioPreferenceKey = IsQA ? "boreumi-ramen-v026-audio-qa" : IsDev ? "boreumi-ramen-v026-audio-dev" : "boreumi-ramen-v026-audio";
  const TutorialPreferenceKey = IsQA ? "boreumi-ramen-v026-tutorial-qa" : IsDev ? "boreumi-ramen-v026-tutorial-dev" : "boreumi-ramen-v026-tutorial";
  const LegacySaveKeys = ["boreumi-ramen-v025", "boreumi-ramen-v024", "boreumi-ramen-v023", "boreumi-ramen-v022", "boreumi-ramen-v021", "boreumi-ramen-v020", "boreumi-ramen-v019", "boreumi-ramen-v0181", "boreumi-ramen-v018", "boreumi-ramen-v017", "boreumi-ramen-v016", "boreumi-ramen-v015"];
  const LegacyAudioPreferenceKeys = ["boreumi-ramen-v025-audio", "boreumi-ramen-v024-audio", "boreumi-ramen-v023-audio", "boreumi-ramen-v022-audio", "boreumi-ramen-v021-audio", "boreumi-ramen-v020-audio", "boreumi-ramen-v019-audio", "boreumi-ramen-v0181-audio", "boreumi-ramen-v018-audio", "boreumi-ramen-v017-audio", "boreumi-ramen-v016-audio"];
  const LegacyTutorialPreferenceKeys = ["boreumi-ramen-v025-tutorial", "boreumi-ramen-v024-tutorial", "boreumi-ramen-v023-tutorial", "boreumi-ramen-v022-tutorial", "boreumi-ramen-v021-tutorial", "boreumi-ramen-v020-tutorial", "boreumi-ramen-v019-tutorial", "boreumi-ramen-v0181-tutorial", "boreumi-ramen-v018-tutorial", "boreumi-ramen-v017-tutorial"];
  const StorageStatus = {
    loadedFrom: "fresh",
    recovered: false,
    lastSavedAt: 0,
    lastError: ""
  };

  const Config = {
    stage: {
      safeWidth: 1920,
      maxWidth: 2340,
      height: 1080,
      currentWidth: 1920
    },
    layout: {
      level: 1,
      currentGuestCapacity: 3,
      futureGuestCapacity: 10,
      inventoryPageSize: 4,
      inventoryCategories: ["ramen", "drinks", "anju"],
      currentStations: ["pot-1", "pot-2", "grill-1", "oden-1"],
      reservedStations: ["takeout", "service-pass"]
    },
    boreumi: { idleWidth: 300, cookingWidth: 300, servingWidth: 360, idleOffset: -210 },
    daySeconds: 300,
    cooking: { tickMs: 50, burns: false, defaultBurnMs: 0 },
    guests: { tickMs: 100, waitsForever: true, patienceMs: 40000, wrongPenaltyMs: 0 },
    takeout: {
      patienceMs: 36000,
      missedPenalty: 500,
      firstArrivals: [9000, 25000, 41000],
      repeatDelayMs: 6500,
      bonusByLevel: Object.freeze([0, 0, .12, .16, .21, .28])
    },
    firstArrivals: [700, 3100, 5500, 7900, 10300, 12700, 15100, 17500, 19900, 22300]
  };

  const FoodArt = {
    pot: "assets/art-v0261/food-ramen-plain-no-scallion-v1.webp",
    potEgg: "assets/art-v0262/food-ramen-egg-no-scallion-v1.webp",
    potScallion: "assets/art-v025/food-ramen-scallion-v1.webp",
    potKimchi: "assets/art-v025/food-ramen-kimchi-v1.webp",
    potCheese: "assets/art-v025/food-ramen-cheese-v1.webp",
    potEggScallion: "assets/art-v026/food-ramen-egg-scallion-v1.webp",
    potKimchiEgg: "assets/art-v026/food-ramen-kimchi-egg-v1.webp",
    potCheeseEgg: "assets/art-v026/food-ramen-cheese-egg-v1.webp",
    potKimchiCheese: "assets/art-v026/food-ramen-kimchi-cheese-v1.webp",
    grill: "assets/art-v012/food-dumpling-v2.webp",
    oden: "assets/art-v012/food-oden.webp"
  };

  const RecipeCatalog = Object.freeze({
    ramen_plain: Object.freeze({
      id: "ramen_plain",
      label: "기본 라면",
      appliance: "pot",
      ingredients: Object.freeze(["noodle"]),
      cookMs: 4200,
      burns: false,
      burnMs: 0,
      sprite: "ramen-plain",
      art: FoodArt.pot
    }),
    ramen_egg: Object.freeze({
      id: "ramen_egg",
      label: "계란 라면",
      appliance: "pot",
      ingredients: Object.freeze(["noodle", "egg"]),
      cookMs: 4200,
      burns: false,
      burnMs: 0,
      sprite: "ramen-egg",
      art: FoodArt.potEgg
    }),
    ramen_scallion: Object.freeze({
      id: "ramen_scallion",
      label: "대파 라면",
      appliance: "pot",
      ingredients: Object.freeze(["noodle", "scallion"]),
      cookMs: 4200,
      burns: false,
      burnMs: 0,
      sprite: "ramen-scallion",
      cookingSprite: "cooking-ramen-scallion",
      art: FoodArt.potScallion
    }),
    ramen_kimchi: Object.freeze({
      id: "ramen_kimchi",
      label: "김치 라면",
      appliance: "pot",
      ingredients: Object.freeze(["noodle", "kimchi"]),
      cookMs: 4400,
      burns: false,
      burnMs: 0,
      sprite: "ramen-kimchi",
      cookingSprite: "cooking-ramen-kimchi",
      art: FoodArt.potKimchi
    }),
    ramen_cheese: Object.freeze({
      id: "ramen_cheese",
      label: "치즈 라면",
      appliance: "pot",
      ingredients: Object.freeze(["noodle", "cheese"]),
      cookMs: 4400,
      burns: false,
      burnMs: 0,
      sprite: "ramen-cheese",
      cookingSprite: "cooking-ramen-cheese",
      art: FoodArt.potCheese
    }),
    ramen_egg_scallion: Object.freeze({
      id: "ramen_egg_scallion", label: "계란 대파 라면", appliance: "pot",
      ingredients: Object.freeze(["noodle", "egg", "scallion"]), cookMs: 4500,
      burns: false, burnMs: 0, sprite: "ramen-egg-scallion",
      cookingSprite: "cooking-ramen-egg-scallion", art: FoodArt.potEggScallion
    }),
    ramen_kimchi_egg: Object.freeze({
      id: "ramen_kimchi_egg", label: "김치 계란 라면", appliance: "pot",
      ingredients: Object.freeze(["noodle", "kimchi", "egg"]), cookMs: 4700,
      burns: false, burnMs: 0, sprite: "ramen-kimchi-egg",
      cookingSprite: "cooking-ramen-kimchi-egg", art: FoodArt.potKimchiEgg
    }),
    ramen_cheese_egg: Object.freeze({
      id: "ramen_cheese_egg", label: "치즈 계란 라면", appliance: "pot",
      ingredients: Object.freeze(["noodle", "cheese", "egg"]), cookMs: 4700,
      burns: false, burnMs: 0, sprite: "ramen-cheese-egg",
      cookingSprite: "cooking-ramen-cheese-egg", art: FoodArt.potCheeseEgg
    }),
    ramen_kimchi_cheese: Object.freeze({
      id: "ramen_kimchi_cheese", label: "김치 치즈 라면", appliance: "pot",
      ingredients: Object.freeze(["noodle", "kimchi", "cheese"]), cookMs: 4900,
      burns: false, burnMs: 0, sprite: "ramen-kimchi-cheese",
      cookingSprite: "cooking-ramen-kimchi-cheese", art: FoodArt.potKimchiCheese
    }),
    grilled_dumpling: Object.freeze({
      id: "grilled_dumpling",
      label: "군만두",
      appliance: "grill",
      ingredients: Object.freeze(["dumpling"]),
      cookMs: 3600,
      burns: false,
      burnMs: 0,
      sprite: "dumpling",
      art: FoodArt.grill
    }),
    warm_oden: Object.freeze({
      id: "warm_oden",
      label: "오뎅",
      appliance: "oden",
      ingredients: Object.freeze(["oden"]),
      cookMs: 3000,
      burns: false,
      burnMs: 0,
      sprite: "oden-warm",
      art: FoodArt.oden
    })
  });

  const MenuCatalog = Object.freeze({
    ramen_plain: Object.freeze({ id: "ramen_plain", kind: "food", label: "기본 라면", art: FoodArt.pot, price: 3500 }),
    ramen_egg: Object.freeze({ id: "ramen_egg", kind: "food", label: "계란 라면", art: FoodArt.potEgg, price: 4000 }),
    ramen_scallion: Object.freeze({ id: "ramen_scallion", kind: "food", label: "대파 라면", art: FoodArt.potScallion, price: 4300 }),
    ramen_kimchi: Object.freeze({ id: "ramen_kimchi", kind: "food", label: "김치 라면", art: FoodArt.potKimchi, price: 4700 }),
    ramen_cheese: Object.freeze({ id: "ramen_cheese", kind: "food", label: "치즈 라면", art: FoodArt.potCheese, price: 5000 }),
    ramen_egg_scallion: Object.freeze({ id: "ramen_egg_scallion", kind: "food", label: "계란 대파 라면", art: FoodArt.potEggScallion, price: 5200 }),
    ramen_kimchi_egg: Object.freeze({ id: "ramen_kimchi_egg", kind: "food", label: "김치 계란 라면", art: FoodArt.potKimchiEgg, price: 5600 }),
    ramen_cheese_egg: Object.freeze({ id: "ramen_cheese_egg", kind: "food", label: "치즈 계란 라면", art: FoodArt.potCheeseEgg, price: 5900 }),
    ramen_kimchi_cheese: Object.freeze({ id: "ramen_kimchi_cheese", kind: "food", label: "김치 치즈 라면", art: FoodArt.potKimchiCheese, price: 6500 }),
    grilled_dumpling: Object.freeze({ id: "grilled_dumpling", kind: "food", label: "군만두", art: FoodArt.grill, price: 2200 }),
    warm_oden: Object.freeze({ id: "warm_oden", kind: "food", label: "오뎅", art: FoodArt.oden, price: 1800 }),
    soju: Object.freeze({ id: "soju", kind: "drink", label: "소주", art: "assets/art-v012/drink-soju-v1.webp", price: 1500 }),
    beer: Object.freeze({ id: "beer", kind: "drink", label: "맥주", art: "assets/art-v012/drink-beer-v1.webp", price: 2000 }),
    somaek: Object.freeze({ id: "somaek", kind: "drink", label: "소맥", art: "assets/art-v012/drink-somaek-v1.webp", price: 2500 }),
    makgeolli: Object.freeze({ id: "makgeolli", kind: "drink", label: "막걸리", art: "assets/art-v012/drink-makgeolli-v1.webp", price: 2000 })
  });

  const CustomerCatalog = Object.freeze([
    Object.freeze({ id: "office", name: "회사원", art: "assets/art-v012/customer-office.webp" }),
    Object.freeze({ id: "rider", name: "배달기사", art: "assets/art-v012/customer-rider.webp" }),
    Object.freeze({ id: "student", name: "학생", art: "assets/art-v012/customer-student.webp" }),
    Object.freeze({ id: "baker", name: "빵집 직원", art: "assets/art-v012/customer-baker-v2.webp" }),
    Object.freeze({ id: "grandma", name: "반찬가게 할머니", art: "assets/art-v012/customer-grandma-v1.webp" }),
    Object.freeze({ id: "driver", name: "택시기사", art: "assets/art-v012/customer-driver-v1.webp" }),
    Object.freeze({ id: "nurse", name: "야간 간호사", art: "assets/art-v012/customer-nurse-v1.webp" }),
    Object.freeze({ id: "florist", name: "꽃집 사장", art: "assets/art-v012/customer-florist-v1.webp" }),
    Object.freeze({ id: "firefighter", name: "소방관", art: "assets/art-v012/customer-firefighter-v1.webp" }),
    Object.freeze({ id: "musician", name: "버스커", art: "assets/art-v012/customer-musician-v1.webp" }),
    Object.freeze({ id: "teacher", name: "초등 교사", art: "assets/art-v012/customer-teacher-v1.webp" }),
    Object.freeze({ id: "fisher", name: "새벽 어부", art: "assets/art-v012/customer-fisher-v1.webp" }),
    Object.freeze({ id: "merchant", name: "시장 상인", art: "assets/art-v012/customer-merchant-v1.webp" }),
    Object.freeze({ id: "police", name: "동네 순경", art: "assets/art-v012/customer-police-v1.webp" }),
    Object.freeze({ id: "cleaner", name: "환경미화원", art: "assets/art-v012/customer-cleaner-v1.webp" }),
    Object.freeze({ id: "artist", name: "웹툰 작가", art: "assets/art-v012/customer-artist-v1.webp" }),
    Object.freeze({ id: "guard", name: "야간 경비원", art: "assets/art-v012/customer-guard-v1.webp" }),
    Object.freeze({ id: "traveler", name: "여행객", art: "assets/art-v012/customer-traveler-v1.webp" })
  ]);
  const CustomerById = Object.freeze(Object.fromEntries(CustomerCatalog.map(customer => [customer.id, customer])));
  function makeCustomerStory({ tagline, favoriteFood, favoriteDrink, first, arrivals, reactions, missed, chapters }) {
    return Object.freeze({
      tagline,
      favoriteFood,
      favoriteDrink,
      first,
      arrivals: Object.freeze(arrivals),
      reactions: Object.freeze(reactions),
      missed,
      chapters: Object.freeze(chapters.map(([required, title, text]) => Object.freeze({ required, title, text })))
    });
  }

  const CustomerStoryCatalog = Object.freeze({
    office: makeCustomerStory({
      tagline: "퇴근길 끝의 따뜻한 자리", favoriteFood: "ramen_plain", favoriteDrink: "soju",
      first: "야근하고 나오니 여기 불빛이 제일 먼저 보였어요.",
      arrivals: ["오늘도 이 자리에서 하루를 내려놓고 갈게요.", "문을 여셨군요. 이제야 퇴근한 기분이에요."],
      reactions: ["따뜻한 국물이 오늘 하루를 정리해 주네요.", "천천히 먹으니 마음까지 풀리는 것 같아요."],
      missed: "오늘은 시간이 엇갈렸네요. 다음 퇴근길에 올게요.",
      chapters: [[1,"늦은 퇴근길","이름도 모른 채 건넨 첫 그릇이 긴 하루의 마침표가 되었다."],[3,"익숙한 창가","회사원은 어느새 빈자리를 먼저 살피고 앉는 손님이 되었다."],[7,"작은 축하","오래 준비한 일이 잘 풀렸다며 조용히 잔을 들었다."],[15,"퇴근 후의 약속","힘든 날에도 이 불빛이 기다린다는 사실이 든든하다고 말했다."]]
    }),
    rider: makeCustomerStory({
      tagline: "도시를 달리고 쉬어 가는 사람", favoriteFood: "grilled_dumpling", favoriteDrink: "beer",
      first: "마지막 배달을 마치고 냄새에 이끌려 들어왔어요.",
      arrivals: ["오늘 길은 복잡했지만 여기까지 무사히 왔어요.", "헬멧을 벗으니 라면 냄새가 더 좋네요."],
      reactions: ["바삭한 만두 한입이면 피로가 싹 가셔요.", "따뜻하게 먹고 다시 힘내볼게요."],
      missed: "다음 배달은 잠깐 미루고 더 일찍 올게요.",
      chapters: [[1,"마지막 배달","비어 있던 의자 하나가 늦은 밤 라이더의 휴게소가 되었다."],[3,"비 오는 골목","젖은 장갑을 말리며 오늘 만난 친절한 손님 이야기를 들려주었다."],[7,"안전 운전 부적","보름이가 건넨 작은 매듭을 헬멧에 달고 다니기 시작했다."],[15,"도시의 지름길","수많은 골목 중 가장 따뜻한 목적지는 이 포차라고 웃었다."]]
    }),
    student: makeCustomerStory({
      tagline: "꿈을 준비하는 늦은 밤", favoriteFood: "ramen_egg", favoriteDrink: "somaek",
      first: "도서관에서 나오니 배가 너무 고팠어요.",
      arrivals: ["오늘 공부한 만큼 든든하게 먹고 갈래요.", "시험보다 메뉴 고르는 게 더 행복해요."],
      reactions: ["계란까지 먹으니 머리가 다시 돌아가는 것 같아요.", "오늘도 잘 버틴 제게 주는 야식이에요."],
      missed: "공부 끝나는 시간을 잘 맞춰서 다시 올게요.",
      chapters: [[1,"도서관 불빛","시험 노트를 품에 안은 학생의 첫 야식이 준비되었다."],[3,"틀린 문제","실수한 문제보다 다시 풀 용기가 중요하다는 이야기를 나눴다."],[7,"합격 문자","떨리는 손으로 합격 화면을 보여주며 가장 먼저 이곳에 달려왔다."],[15,"새로운 교재","이제는 후배를 가르친다며 조금 어른스러운 표정으로 앉았다."]]
    }),
    baker: makeCustomerStory({
      tagline: "새벽 빵 냄새를 품은 손님", favoriteFood: "warm_oden", favoriteDrink: "makgeolli",
      first: "반죽을 재워두고 잠깐 숨 돌리러 왔어요.",
      arrivals: ["오늘 빵도 잘 부풀었어요. 이제 제 마음도 데울 차례네요.", "새벽 준비 전에 따뜻한 국물부터 생각났어요."],
      reactions: ["오뎅 국물이 반죽 기다리는 시간처럼 편안해요.", "속이 따뜻해지니 좋은 빵이 나올 것 같아요."],
      missed: "오븐 시간이 급했어요. 다음엔 여유 있게 올게요.",
      chapters: [[1,"잠든 반죽","빵집 직원은 발효를 기다리는 동안 첫 국물을 마셨다."],[3,"남은 빵 봉투","마감 뒤 남은 빵을 보름이와 나누며 서로의 하루를 응원했다."],[7,"나만의 레시피","오랫동안 고친 빵을 가져와 포차의 첫 시식회를 열었다."],[15,"작은 간판","언젠가 자기 이름의 빵집을 열겠다는 꿈을 조심스럽게 꺼냈다."]]
    }),
    grandma: makeCustomerStory({
      tagline: "시장 골목의 넉넉한 마음", favoriteFood: "warm_oden", favoriteDrink: "makgeolli",
      first: "가게 문 닫고 보니 저녁을 또 깜빡했구먼.",
      arrivals: ["오늘 반찬이 잘 팔려서 마음이 가볍네.", "보름이 얼굴도 보고 뜨끈한 것도 먹으러 왔지."],
      reactions: ["국물이 참 정직하고 따뜻해. 마음이 들어갔어.", "잘 먹었네. 내일 장사도 든든하겠어."],
      missed: "시장 일이 길어졌네. 내일은 꼭 들르지.",
      chapters: [[1,"시장 마감","반찬가게 할머니는 빈 그릇을 보며 보름이 손맛을 칭찬했다."],[3,"김치 한 통","국물에 잘 어울린다며 직접 담근 김치를 살며시 놓고 갔다."],[7,"손녀 이야기","멀리 사는 손녀가 보름이와 닮았다며 오래된 사진을 보여주었다."],[15,"골목의 어른","힘든 일이 생기면 언제든 시장으로 오라며 든든한 편이 되어주었다."]]
    }),
    driver: makeCustomerStory({
      tagline: "밤길의 사연을 싣고 오는 사람", favoriteFood: "ramen_plain", favoriteDrink: "somaek",
      first: "손님 내려드리고 돌아가는 길에 불빛이 보여서요.",
      arrivals: ["오늘도 도시 한 바퀴 돌고 제자리로 왔네요.", "밤길 끝에는 역시 뜨거운 라면이죠."],
      reactions: ["국물 한 숟갈에 도로 소음이 멀어지는 것 같아요.", "이제 안전하게 집까지 갈 힘이 생겼어요."],
      missed: "장거리 손님이 있었어요. 다음 운행 끝엔 꼭 들를게요.",
      chapters: [[1,"첫 막차 뒤","택시기사는 조용해진 도로에서 발견한 포차를 기억해 두었다."],[3,"잊힌 우산","차에 남은 우산의 주인을 찾아준 이야기에 모두가 미소 지었다."],[7,"새벽의 승객","힘들어하던 승객을 무사히 가족에게 데려다준 밤을 들려주었다."],[15,"돌아오는 길","어디까지 달려도 마지막에는 이 포차 방향으로 핸들을 돌린다고 했다."]]
    }),
    nurse: makeCustomerStory({
      tagline: "누군가의 밤을 지키는 손님", favoriteFood: "ramen_egg", favoriteDrink: "beer",
      first: "야간 근무가 끝났는데 바로 잠들기는 아쉬워서요.",
      arrivals: ["오늘 병동도 무사했어요. 이제 제 끼니를 챙기려고요.", "따뜻한 한 그릇 생각으로 마지막 순회를 버텼어요."],
      reactions: ["누가 차려준 음식을 먹으니 저도 돌봄 받는 기분이에요.", "이 온기까지 잘 챙겨서 돌아갈게요."],
      missed: "급한 일이 생겼어요. 다음 쉬는 날엔 천천히 먹고 갈게요.",
      chapters: [[1,"근무가 끝난 뒤","야간 간호사는 처음으로 자기 자신을 위한 식사를 천천히 했다."],[3,"회복 소식","오랫동안 돌보던 환자가 건강히 퇴원했다는 기쁜 소식을 전했다."],[7,"조용한 응원","힘든 근무 날마다 포차의 불빛을 떠올린다는 이야기를 남겼다."],[15,"서로의 안부","이제는 주문보다 먼저 보름이와 뽀미의 건강부터 묻는 단골이 되었다."]]
    }),
    florist: makeCustomerStory({
      tagline: "꽃이 진 뒤에도 향기를 남기는 사람", favoriteFood: "grilled_dumpling", favoriteDrink: "makgeolli",
      first: "가게 정리하고 남은 꽃향기까지 데려왔네요.",
      arrivals: ["오늘은 따뜻한 색 꽃이 많이 나갔어요.", "포차 불빛을 보면 주황빛 꽃다발이 떠올라요."],
      reactions: ["바삭한 소리까지 작은 축제 같아요.", "오늘 남은 향기와 온기가 잘 어울리네요."],
      missed: "늦은 꽃 배달이 있었어요. 다음엔 작은 꽃도 가져올게요.",
      chapters: [[1,"남은 꽃 한 송이","꽃집 사장은 팔리지 않은 꽃 한 송이를 포차 창가에 꽂아두었다."],[3,"계절의 색","계절마다 포차에 어울리는 꽃을 골라 작은 장식을 만들었다."],[7,"첫 고백의 꽃다발","손님의 고백이 성공했다는 소식에 자기 일처럼 기뻐했다."],[15,"시들지 않는 자리","꽃은 지지만 함께 먹은 밤의 기억은 오래 남는다고 말했다."]]
    }),
    firefighter: makeCustomerStory({
      tagline: "뜨거운 현장 뒤의 조용한 휴식", favoriteFood: "grilled_dumpling", favoriteDrink: "beer",
      first: "훈련 끝나고 동료가 여기 국물이 좋다고 해서 왔어요.",
      arrivals: ["오늘도 모두 무사히 돌아왔습니다.", "장비를 내려놓으니 이제야 배고픈 줄 알겠네요."],
      reactions: ["잘 먹었습니다. 든든해야 더 잘 지킬 수 있죠.", "뜨거운 음식인데 마음은 편안해지네요."],
      missed: "출동이 있었어요. 무사히 끝났으니 다음에 웃으며 올게요.",
      chapters: [[1,"무사 귀환","소방관은 동료들과 나눌 만두 한 접시를 더 기억해 두었다."],[3,"검댕 묻은 소매","긴 출동 뒤에도 아무도 다치지 않았다며 안도했다."],[7,"아이의 편지","구조했던 아이가 보낸 삐뚤빼뚤한 감사 편지를 보여주었다."],[15,"마음을 지키는 곳","사람을 지키는 자신도 이곳에서는 잠시 보호받는 기분이라고 말했다."]]
    }),
    musician: makeCustomerStory({
      tagline: "골목의 밤을 노래하는 사람", favoriteFood: "warm_oden", favoriteDrink: "beer",
      first: "연주 끝나고 박수보다 라면 냄새가 더 오래 남았어요.",
      arrivals: ["오늘은 새 노래를 한 소절 완성했어요.", "포차의 소리를 들으면 멜로디가 떠올라요."],
      reactions: ["이 맛은 후렴처럼 자꾸 생각날 것 같아요.", "배가 차니 막혔던 가사도 풀리네요."],
      missed: "공연이 길어졌어요. 다음엔 새 노래를 들려드릴게요.",
      chapters: [[1,"첫 번째 후렴","버스커는 냄비 끓는 소리를 박자로 삼아 짧은 멜로디를 만들었다."],[3,"포차의 노래","보름이와 뽀미가 들어간 따뜻한 노래 한 곡을 완성했다."],[7,"작은 관객들","골목 사람들이 연주를 들으러 모여 포차 앞이 잠시 무대가 되었다."],[15,"돌아오는 노래","멀리 공연을 다녀와도 가장 먼저 들려주고 싶은 관객은 여기 있다고 했다."]]
    }),
    teacher: makeCustomerStory({
      tagline: "아이들의 하루를 품고 오는 선생님", favoriteFood: "ramen_egg", favoriteDrink: "makgeolli",
      first: "학부모 상담까지 마치니 목소리도 배도 텅 비었네요.",
      arrivals: ["오늘 아이들이 정말 많이 웃었어요.", "교실 이야기를 잠시 내려놓고 쉬다 갈게요."],
      reactions: ["한 그릇 다 먹으니 내일 칭찬할 힘이 생겼어요.", "보름이처럼 따뜻하게 아이들을 대하고 싶네요."],
      missed: "학교 일이 늦어졌어요. 다음엔 숙제 검사도 일찍 끝낼게요.",
      chapters: [[1,"빨간 펜을 내려놓고","초등 교사는 채점 가방을 옆에 두고 오랜만에 천천히 식사했다."],[3,"삐뚤한 편지","아이들이 써준 감사 편지를 읽다가 살짝 눈시울을 붉혔다."],[7,"졸업식 전날","첫 제자들의 졸업을 앞두고 기쁘고 아쉬운 마음을 털어놓았다."],[15,"다시 만난 제자","훌쩍 큰 제자가 찾아왔다며 선생님이 된 보람을 환하게 이야기했다."]]
    }),
    fisher: makeCustomerStory({
      tagline: "새벽 바다를 먼저 만나는 사람", favoriteFood: "warm_oden", favoriteDrink: "soju",
      first: "배 나가기 전엔 따뜻한 걸 먹어둬야 바람을 견디죠.",
      arrivals: ["오늘 바다는 얌전했어요. 마음도 그렇고요.", "물때 보기 전에 포차 불빛부터 확인했네요."],
      reactions: ["이 국물이 새벽 바닷바람보다 먼저 몸을 깨워주네요.", "든든히 먹었으니 오늘도 무사히 다녀오겠습니다."],
      missed: "파도가 높아 시간이 바뀌었어요. 잔잔한 날 다시 올게요.",
      chapters: [[1,"출항 전 한 그릇","새벽 어부는 김이 오르는 국물로 바다에 나갈 준비를 마쳤다."],[3,"빈 그물의 날","잡은 것이 없어도 무사히 돌아온 날이 좋은 날이라며 웃었다."],[7,"큰 은빛 물고기","오랜만의 큰 수확보다 함께 기뻐해 줄 사람이 있어 좋다고 했다."],[15,"등대 같은 불빛","멀리서 돌아올 때 포차의 달 간판이 작은 등대처럼 보인다고 말했다."]]
    }),
    merchant: makeCustomerStory({
      tagline: "시장 하루를 누구보다 먼저 여는 사람", favoriteFood: "grilled_dumpling", favoriteDrink: "soju",
      first: "새벽 경매 가기 전에 배부터 든든히 채우러 왔소.",
      arrivals: ["오늘 시장 인심도 물건도 넉넉했어요.", "장부 덮고 나니 이 집 생각이 딱 나더라고."],
      reactions: ["이 정도 정성이면 시장에서도 소문나겠어.", "든든히 먹었으니 내일 흥정도 문제없지."],
      missed: "물건 들어오는 시간이 꼬였네. 다음 장날엔 꼭 오지.",
      chapters: [[1,"첫 장날","시장 상인은 맛을 본 뒤 단골들에게 포차 이야기를 슬쩍 퍼뜨렸다."],[3,"덤 한 봉지","좋은 재료를 골랐다며 장바구니에 덤을 한가득 담아왔다."],[7,"골목 잔치","시장 사람들과 작은 잔치를 열자고 먼저 소매를 걷어붙였다."],[15,"오래된 장부","단골 이름 사이에 보름이의 포차를 크게 적으며 오래 함께하자고 했다."]]
    }),
    police: makeCustomerStory({
      tagline: "동네의 밤을 천천히 살피는 사람", favoriteFood: "ramen_plain", favoriteDrink: "somaek",
      first: "순찰 돌다가 따뜻한 냄새가 나서 잠깐 들렀습니다.",
      arrivals: ["오늘 골목은 평화롭습니다. 뽀미도 잘 있네요.", "이곳 불빛이 켜져 있으면 순찰길도 마음이 놓여요."],
      reactions: ["든든하게 먹었으니 한 바퀴 더 살펴볼게요.", "따뜻한 가게가 있는 골목은 오래 지키고 싶어져요."],
      missed: "도움을 요청한 이웃이 있었어요. 다음 순찰 때 들르겠습니다.",
      chapters: [[1,"평화로운 순찰","동네 순경은 포차를 야간 순찰의 안심 지점으로 기억했다."],[3,"길 잃은 아이","울던 아이를 가족에게 데려다준 뒤 늦은 저녁을 먹었다."],[7,"뽀미의 친구","순찰할 때마다 뽀미에게 먼저 인사하는 특별한 친구가 되었다."],[15,"안심 골목","서로 안부를 묻는 가게들이 많아질수록 동네가 안전해진다고 말했다."]]
    }),
    cleaner: makeCustomerStory({
      tagline: "잠든 도시를 깨끗이 여는 사람", favoriteFood: "warm_oden", favoriteDrink: "makgeolli",
      first: "거리가 조용해질 때가 우리에겐 일 시작할 시간이죠.",
      arrivals: ["오늘 골목도 말끔해졌어요. 이제 저도 쉬어야죠.", "계절이 바뀌면 거리의 냄새부터 달라져요."],
      reactions: ["따뜻한 국물이 새벽 찬 공기를 밀어내네요.", "잘 먹고 나니 도시가 조금 더 환해 보입니다."],
      missed: "낙엽이 많아 일이 길어졌어요. 내일은 꼭 쉬어갈게요.",
      chapters: [[1,"도시의 새벽","환경미화원은 아무도 모르는 새벽 풍경을 보름이에게 들려주었다."],[3,"첫눈 내린 거리","눈을 치운 뒤 가장 먼저 남은 발자국이 포차로 향했다."],[7,"고마운 쪽지","골목 아이가 붙여둔 감사 쪽지를 주머니에서 소중히 꺼냈다."],[15,"깨끗한 아침","사람들이 기분 좋게 하루를 시작하는 것이 자신의 보람이라고 말했다."]]
    }),
    artist: makeCustomerStory({
      tagline: "마감과 상상 사이에 사는 사람", favoriteFood: "ramen_egg", favoriteDrink: "beer",
      first: "마감하다 보니 오늘 첫 끼가 지금이네요.",
      arrivals: ["오늘은 선이 마음대로 잘 그려졌어요.", "막힌 장면을 두고 왔더니 여기서 답이 보일 것 같아요."],
      reactions: ["맛있는 장면은 설명보다 표정으로 그려야겠어요.", "배가 부르니 다음 화 마지막 칸이 떠올랐어요."],
      missed: "마감 직전이라 못 나왔어요. 원고 넘기고 달려올게요.",
      chapters: [[1,"빈 말풍선","웹툰 작가는 포차에서 들은 말 한마디로 비어 있던 장면을 채웠다."],[3,"첫 연재일","오래 준비한 작품의 첫 화가 공개된 밤을 함께 축하했다."],[7,"독자의 편지","이야기 덕분에 위로받았다는 독자 편지를 읽으며 조용히 웃었다."],[15,"포차의 한 컷","작품 배경 한쪽에 달 간판과 뽀미를 몰래 그려 넣었다고 고백했다."]]
    }),
    guard: makeCustomerStory({
      tagline: "고요한 건물을 지키는 밤의 손님", favoriteFood: "grilled_dumpling", favoriteDrink: "soju",
      first: "교대 전에 사람 목소리 좀 듣고 싶어서 왔습니다.",
      arrivals: ["오늘 건물은 조용했습니다. 조용한 게 제일 좋은 밤이죠.", "여기 오면 혼자 근무한 밤도 덜 외롭게 느껴져요."],
      reactions: ["바삭한 소리를 들으니 정신이 또렷해지네요.", "따뜻하게 먹고 새벽까지 잘 지켜보겠습니다."],
      missed: "점검할 곳이 많았습니다. 다음 교대 전에는 꼭 들르죠.",
      chapters: [[1,"교대 전의 불빛","야간 경비원은 말없이 먹는 시간도 함께라서 편안하다고 했다."],[3,"옥상의 별","아무도 없는 건물 옥상에서 본 별자리를 천천히 설명해 주었다."],[7,"길고양이 순찰대","건물 주변 고양이들에게 이름을 붙이고 밥을 챙긴다는 비밀을 털어놓았다."],[15,"조용한 인사","말수가 적어도 매일 같은 시간 건네는 인사가 큰 힘이 된다고 말했다."]]
    }),
    traveler: makeCustomerStory({
      tagline: "낯선 길에서 따뜻한 자리를 찾은 사람", favoriteFood: "ramen_plain", favoriteDrink: "makgeolli",
      first: "지도에는 없었는데 가장 좋은 곳을 발견한 것 같아요.",
      arrivals: ["다른 도시를 돌고도 이 골목이 생각나 다시 왔어요.", "이번 여행의 시작도 끝도 여기서 하고 싶었어요."],
      reactions: ["낯선 곳에서 먹는 익숙한 맛이 제일 오래 기억돼요.", "이 한 그릇도 여행 일기에 꼭 적어둘게요."],
      missed: "기차 시간이 바뀌었어요. 다시 이 도시에 오면 꼭 찾을게요.",
      chapters: [[1,"지도 밖의 포차","여행객은 우연히 만난 달 간판을 여행 수첩 첫 장에 그렸다."],[3,"돌아온 엽서","다른 도시에서 보낸 엽서가 포차 선반 한쪽에 도착했다."],[7,"두 번째 여행","볼거리가 아니라 보고 싶은 사람들이 있어 다시 왔다고 말했다."],[15,"머물고 싶은 도시","언젠가 이 골목 가까이에 오래 살아보고 싶다는 계획을 꺼냈다."]]
    })
  });
  const IngredientCatalog = Object.freeze({
    noodle: Object.freeze({ id: "noodle", label: "면", category: "ramen", art: "assets/art-v012/ingredient-noodle-v4.webp", unitCost: 260, targetStock: 18, unlockLevel: 1 }),
    egg: Object.freeze({ id: "egg", label: "계란", category: "ramen", art: "assets/art-v012/ingredient-egg-v4.webp", unitCost: 140, targetStock: 10, unlockLevel: 1 }),
    scallion: Object.freeze({ id: "scallion", label: "대파", category: "ramen", art: "assets/art-v025/ingredient-scallion-v1.webp", unitCost: 170, targetStock: 10, unlockLevel: 2 }),
    kimchi: Object.freeze({ id: "kimchi", label: "김치", category: "ramen", art: "assets/art-v025/ingredient-kimchi-v1.webp", unitCost: 230, targetStock: 10, unlockLevel: 3 }),
    cheese: Object.freeze({ id: "cheese", label: "치즈", category: "ramen", art: "assets/art-v025/ingredient-cheese-v1.webp", unitCost: 320, targetStock: 8, unlockLevel: 4 }),
    dumpling: Object.freeze({ id: "dumpling", label: "군만두", category: "anju", art: "assets/art-v012/ingredient-dumpling-v4.webp", unitCost: 420, targetStock: 12, unlockLevel: 1 }),
    oden: Object.freeze({ id: "oden", label: "오뎅", category: "anju", art: "assets/art-v012/ingredient-oden-v4.webp", unitCost: 300, targetStock: 12, unlockLevel: 1 }),
    soju: Object.freeze({ id: "soju", label: "소주", category: "drinks", art: "assets/art-v012/drink-soju-v1.webp", unitCost: 480, targetStock: 12, unlockLevel: 1, kind: "drink" }),
    beer: Object.freeze({ id: "beer", label: "맥주", category: "drinks", art: "assets/art-v012/drink-beer-v1.webp", unitCost: 650, targetStock: 12, unlockLevel: 1, kind: "drink" }),
    somaek: Object.freeze({ id: "somaek", label: "소맥", category: "drinks", art: "assets/art-v012/drink-somaek-v1.webp", unitCost: 760, targetStock: 10, unlockLevel: 1, kind: "drink" }),
    makgeolli: Object.freeze({ id: "makgeolli", label: "막걸리", category: "drinks", art: "assets/art-v012/drink-makgeolli-v1.webp", unitCost: 590, targetStock: 10, unlockLevel: 1, kind: "drink" })
  });

  const MenuUnlockLevel = Object.freeze({
    ramen_plain: 1, ramen_egg: 1, grilled_dumpling: 1, warm_oden: 1,
    ramen_scallion: 2, ramen_egg_scallion: 2,
    ramen_kimchi: 3, ramen_kimchi_egg: 3,
    ramen_cheese: 4, ramen_cheese_egg: 4,
    ramen_kimchi_cheese: 5
  });
  const BaseSeenMenus = Object.freeze(["ramen_plain", "ramen_egg", "grilled_dumpling", "warm_oden"]);

  function unlockedFoodOrderPool(level = effectiveStallLevel()) {
    return Object.values(MenuCatalog).filter(item => item.kind === "food" && (MenuUnlockLevel[item.id] || 1) <= level).map(item => item.id);
  }

  function drinkOrderPool() {
    return Object.values(MenuCatalog).filter(item => item.kind === "drink").map(item => item.id);
  }

  const ProgressionMilestones = Object.freeze([
    Object.freeze({ day: 1, stall: 1, seats: 3, customers: 3, label: "첫 포차" }),
    Object.freeze({ day: 10, stall: 1, seats: 4, customers: 6, label: "DAY 10" }),
    Object.freeze({ day: 25, stall: 1, seats: 5, customers: 8, label: "DAY 25" }),
    Object.freeze({ day: 50, stall: 2, seats: 6, customers: 10, label: "포차 LV.2 + DAY 50" }),
    Object.freeze({ day: 1, stall: 3, seats: 7, customers: 12, label: "포차 LV.3" }),
    Object.freeze({ day: 1, stall: 4, seats: 8, customers: 15, label: "포차 LV.4" }),
    Object.freeze({ day: 1, stall: 5, seats: 10, customers: 18, label: "포차 LV.5" })
  ]);

  const StationUpgradeCatalog = Object.freeze({
    pot: Object.freeze({
      id: "pot",
      title: "라면 화구",
      subtitle: "모든 냄비 강화",
      costs: Object.freeze([12000, 32000, 72000, 150000]),
      speed: Object.freeze([1, .92, .82, .72, .62]),
      burnBonus: Object.freeze([0, 0, 3000, 6000, 10000]),
      priceBonus: Object.freeze([0, 0, 0, .05, .12])
    }),
    grill: Object.freeze({
      id: "grill",
      title: "만두 그릴",
      subtitle: "모든 그릴 강화",
      costs: Object.freeze([10000, 28000, 65000, 135000]),
      speed: Object.freeze([1, .93, .84, .74, .64]),
      burnBonus: Object.freeze([0, 2000, 4000, 7000, 11000]),
      priceBonus: Object.freeze([0, 0, 0, .05, .12])
    }),
    oden: Object.freeze({
      id: "oden",
      title: "오뎅바",
      subtitle: "보온·회전율 강화",
      costs: Object.freeze([8000, 24000, 56000, 120000]),
      speed: Object.freeze([1, .9, .8, .7, .6]),
      burnBonus: Object.freeze([0, 0, 0, 0, 0]),
      priceBonus: Object.freeze([0, 0, .05, .1, .15])
    })
  });

  const StallUpgradeCatalog = Object.freeze({
    maxLevel: 5,
    costs: Object.freeze([50000, 140000, 320000, 700000]),
    benefits: Object.freeze({
      2: "냄비 3개·포장 주문 1건 해금 · DAY 50부터 좌석 6석/손님 10명",
      3: "그릴 2개·완성대 2칸 해금 · 좌석 7석/손님 12명",
      4: "포장 주문 2건·완성대 3칸 · 좌석 8석/손님 15명",
      5: "포장 주문 3건·완성대 4칸 · 좌석 10석/손님 18명"
    })
  });

  function freshProgress() {
    return {
      version: 10,
      day: 1,
      gold: 0,
      stallLevel: 1,
      stationLevels: { pot: 1, grill: 1, oden: 1 },
      inventory: Object.fromEntries(Object.values(IngredientCatalog).map(item => [item.id, item.targetStock])),
      stats: { completedDays: 0, successfulDays: 0, totalSales: 0, totalServed: 0, totalMissed: 0, totalWaste: 0, totalTakeoutServed: 0, totalTakeoutMissed: 0, totalSupplyCost: 0 },
      regulars: Object.fromEntries(CustomerCatalog.map(customer => [customer.id, { visits: 0, served: 0, missed: 0, chapters: 0, lastDay: 0, affection: 0, lastFood: "", lastDrink: "" }])),
      storyLog: [],
      journalSeen: 0,
      menuUnlocksSeen: [...BaseSeenMenus]
    };
  }

  function sanitizeProgress(raw) {
    const clean = freshProgress();
    if (!raw || typeof raw !== "object") return clean;
    clean.day = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(raw.day) || 1)));
    clean.gold = Math.max(0, Math.floor(Number(raw.gold) || 0));
    clean.stallLevel = Math.max(1, Math.min(5, Math.floor(Number(raw.stallLevel) || 1)));
    const legacyUpgradeLevel = Math.max(0, ...Object.values(raw.upgrades || {}).map(value => Math.floor(Number(value) || 0)));
    Object.keys(clean.stationLevels).forEach(key => {
      const migrated = raw.stationLevels?.[key] ?? Math.min(5, Math.max(clean.stallLevel, legacyUpgradeLevel + 1));
      clean.stationLevels[key] = Math.max(1, Math.min(5, Math.floor(Number(migrated) || 1)));
    });
    clean.stallLevel = Math.min(clean.stallLevel, Math.min(...Object.values(clean.stationLevels)));
    Object.keys(clean.stats).forEach(key => {
      clean.stats[key] = Math.max(0, Math.floor(Number(raw.stats?.[key]) || 0));
    });
    Object.values(IngredientCatalog).forEach(item => {
      const value = raw.inventory?.[item.id];
      clean.inventory[item.id] = value == null ? item.targetStock : Math.max(0, Math.floor(Number(value) || 0));
    });
    Object.keys(clean.regulars).forEach(customerId => {
      const source = raw.regulars?.[customerId];
      ["visits", "served", "missed", "chapters", "lastDay", "affection"].forEach(key => {
        clean.regulars[customerId][key] = Math.max(0, Math.floor(Number(source?.[key]) || 0));
      });
      clean.regulars[customerId].lastFood = MenuCatalog[source?.lastFood]?.kind === "food" ? source.lastFood : "";
      clean.regulars[customerId].lastDrink = MenuCatalog[source?.lastDrink]?.kind === "drink" ? source.lastDrink : "";
    });
    clean.storyLog = Array.isArray(raw.storyLog) ? raw.storyLog.slice(-200).map(entry => ({
      day: Math.max(1, Math.floor(Number(entry?.day) || 1)),
      customerId: CustomerById[entry?.customerId] ? entry.customerId : "office",
      chapter: Math.max(1, Math.floor(Number(entry?.chapter) || 1)),
      title: String(entry?.title || `${CustomerById[entry?.customerId]?.name || "손님"}의 이야기`).slice(0, 60),
      text: String(entry?.text || "포차의 이야기가 이어졌어요.").slice(0, 180),
      relationship: String(entry?.relationship || "손님").slice(0, 30),
      servedAt: Math.max(1, Math.floor(Number(entry?.servedAt) || Number(entry?.chapter) || 1))
    })) : [];
    clean.journalSeen = Math.max(0, Math.min(clean.storyLog.length, Math.floor(Number(raw.journalSeen) || 0)));
    clean.menuUnlocksSeen = Array.isArray(raw.menuUnlocksSeen)
      ? [...new Set(raw.menuUnlocksSeen.filter(id => MenuCatalog[id]))]
      : Object.keys(MenuUnlockLevel).filter(id => MenuUnlockLevel[id] <= clean.stallLevel);
    return clean;
  }

  function decodeProgress(serialized) {
    if (!serialized) return null;
    const raw = JSON.parse(serialized);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("invalid-save");
    return sanitizeProgress(raw);
  }

  function recoverSerializedProgress(primarySerialized, backupSerialized) {
    try {
      const primary = decodeProgress(primarySerialized);
      if (primary) return { progress: primary, source: "primary", recovered: false };
    } catch { /* Try the automatic backup below. */ }
    try {
      const backup = decodeProgress(backupSerialized);
      if (backup) return { progress: backup, source: "backup", recovered: true };
    } catch { /* A fresh save is safer than loading malformed data. */ }
    return { progress: freshProgress(), source: "fresh", recovered: false };
  }

  function loadProgress() {
    try {
      if (IsQA) {
        localStorage.removeItem(SaveKey);
        localStorage.removeItem(BackupKey);
      }
      const recovery = recoverSerializedProgress(localStorage.getItem(SaveKey), localStorage.getItem(BackupKey));
      if (recovery.source !== "fresh") {
        StorageStatus.loadedFrom = recovery.source;
        StorageStatus.recovered = recovery.recovered;
        if (recovery.recovered) localStorage.setItem(SaveKey, JSON.stringify(recovery.progress));
        return recovery.progress;
      }
      if (!IsQA && !IsDev) {
        const legacyKey = LegacySaveKeys.find(key => localStorage.getItem(key));
        const legacy = legacyKey ? decodeProgress(localStorage.getItem(legacyKey)) : null;
        if (legacy) {
          StorageStatus.loadedFrom = legacyKey;
          localStorage.setItem(SaveKey, JSON.stringify(legacy));
          return legacy;
        }
      }
    } catch (error) {
      StorageStatus.lastError = String(error?.message || error);
    }
    StorageStatus.loadedFrom = "fresh";
    return freshProgress();
  }

  function saveProgress() {
    try {
      const serialized = JSON.stringify(Progress);
      const existing = localStorage.getItem(SaveKey);
      if (existing && existing !== serialized) {
        try {
          decodeProgress(existing);
          localStorage.setItem(BackupKey, existing);
        } catch { /* Never replace a healthy backup with malformed data. */ }
      }
      localStorage.setItem(SaveKey, serialized);
      StorageStatus.loadedFrom = "primary";
      StorageStatus.recovered = false;
      StorageStatus.lastSavedAt = Date.now();
      StorageStatus.lastError = "";
      updateMobileCare();
      return true;
    } catch (error) {
      StorageStatus.lastError = String(error?.message || error);
      updateMobileCare();
      return false;
    }
  }

  let Progress = loadProgress();
  window.BoreumiStorage = Object.assign(StorageStatus, { recoverSerializedProgress });
  window.BoreumiBoot?.markDataReady();
  let qaRandomSeed = 181;

  function randomUnit() {
    if (!IsQA) return Math.random();
    qaRandomSeed = (qaRandomSeed * 1664525 + 1013904223) >>> 0;
    return qaRandomSeed / 4294967296;
  }

  function randomChoice(items) {
    return items[Math.floor(randomUnit() * items.length)];
  }

  function effectiveStallLevel() {
    return PreviewLevel || Progress.stallLevel;
  }

  function effectiveDay() {
    return PreviewDay || Progress.day;
  }

  function isIngredientUnlocked(id, level = effectiveStallLevel()) {
    return Boolean(IngredientCatalog[id]) && IngredientCatalog[id].unlockLevel <= level;
  }

  function ingredientStock(id) {
    return Math.max(0, Math.floor(Number(Progress.inventory?.[id]) || 0));
  }

  function consumeIngredient(id) {
    if (State.tutorialMode) return true;
    if (!isIngredientUnlocked(id)) return false;
    if (ingredientStock(id) <= 0) return false;
    Progress.inventory[id] -= 1;
    saveProgress();
    renderDockCategory(IngredientCatalog[id].category);
    return true;
  }

  function supplyPlan() {
    const items = Object.values(IngredientCatalog).filter(item => isIngredientUnlocked(item.id)).map(item => {
      const quantity = Math.max(0, item.targetStock - ingredientStock(item.id));
      return { ...item, quantity, cost: quantity * item.unitCost };
    });
    return { items, total: items.reduce((sum, item) => sum + item.cost, 0), quantity: items.reduce((sum, item) => sum + item.quantity, 0) };
  }

  function recipeCost(recipeId) {
    const recipe = RecipeCatalog[recipeId];
    if (recipe) return recipe.ingredients.reduce((sum, id) => sum + (IngredientCatalog[id]?.unitCost || 0), 0);
    return IngredientCatalog[recipeId]?.unitCost || 0;
  }

  function buyIngredient(id, requestedQuantity) {
    if (!IngredientCatalog[id]) return false;
    const item = IngredientCatalog[id];
    if (!isIngredientUnlocked(id, Progress.stallLevel)) return toast(`포차 LV.${item.unlockLevel}에서 구매할 수 있어요.`);
    const missing = Math.max(0, item.targetStock - ingredientStock(id));
    const quantity = requestedQuantity === "all" ? missing : Math.min(missing, Math.max(1, Math.floor(Number(requestedQuantity) || 1)));
    if (!quantity) return toast(`${item.label} 재고가 이미 가득해요.`);
    const cost = quantity * item.unitCost;
    if (Progress.gold < cost) return toast(`${item.label} ${quantity}개 구매에 ${money(cost)}이 필요해요.`);
    Progress.gold -= cost;
    Progress.inventory[id] += quantity;
    Progress.stats.totalSupplyCost += cost;
    saveProgress();
    renderDockCategory(item.category);
    renderHud();
    renderUpgradeShop();
    renderSupplyShop();
    Sound.sfx("upgrade");
    toast(`${item.label} ${quantity}개 구매 · ${money(cost)}`);
    return true;
  }

  function progressionMilestone(day = effectiveDay(), stallLevel = effectiveStallLevel()) {
    return ProgressionMilestones.reduce((current, milestone) => (
      day >= milestone.day && stallLevel >= milestone.stall ? milestone : current
    ), ProgressionMilestones[0]);
  }

  function guestCapacityForLevel(level = effectiveStallLevel(), day = effectiveDay()) {
    return progressionMilestone(day, level).seats;
  }

  function customerPoolSize(level = effectiveStallLevel(), day = effectiveDay()) {
    return progressionMilestone(day, level).customers;
  }

  function unlockedCustomers() {
    return CustomerCatalog.slice(0, customerPoolSize());
  }

  function stageWidthForCapacity(capacity = guestCapacityForLevel()) {
    if (capacity >= 7) return 2340;
    if (capacity >= 6) return 2160;
    return Config.stage.safeWidth;
  }

  function stationCountsForLevel(level = effectiveStallLevel()) {
    return {
      pot: level >= 2 ? 3 : 2,
      grill: level >= 3 ? 2 : 1,
      oden: 1
    };
  }

  function takeoutCapacityForLevel(level = effectiveStallLevel()) {
    if (level >= 5) return 3;
    if (level >= 4) return 2;
    if (level >= 2) return 1;
    return 0;
  }

  function completionPassCapacityForLevel(level = effectiveStallLevel()) {
    if (level >= 5) return 4;
    if (level >= 4) return 3;
    if (level >= 3) return 2;
    return 0;
  }

  function effectiveTakeoutPatienceMs() {
    const dayPressure = Math.min(8000, Math.max(0, effectiveDay() - 1) * 240);
    return Math.max(28000, Config.takeout.patienceMs - dayPressure);
  }

  function isApplianceUnlocked(appliance, level = effectiveStallLevel()) {
    return appliance.slot < stationCountsForLevel(level)[appliance.type];
  }

  function applyStallLevel() {
    const level = effectiveStallLevel();
    const capacity = guestCapacityForLevel(level);
    const poolSize = customerPoolSize(level);
    const stationCounts = stationCountsForLevel(level);
    const takeoutCapacity = takeoutCapacityForLevel(level);
    const passCapacity = completionPassCapacityForLevel(level);
    Progress.inventory ||= {};
    Object.values(IngredientCatalog).forEach(item => {
      if (item.unlockLevel <= level && Progress.inventory[item.id] == null) Progress.inventory[item.id] = item.targetStock;
    });
    Config.layout.level = level;
    const stage = $("#stage");
    if (stage) {
      stage.dataset.growthLevel = String(level);
      stage.dataset.guestCapacity = String(capacity);
      stage.dataset.customerPool = String(poolSize);
      stage.dataset.takeoutCapacity = String(takeoutCapacity);
      stage.dataset.passCapacity = String(passCapacity);
    }
    const row = $("#guestRow");
    if (row) row.dataset.capacity = String(capacity);
    Guests?.forEach(guest => {
      const slot = $(`[data-guest="${guest.index}"]`);
      if (!slot) return;
      const locked = guest.index >= capacity;
      slot.hidden = locked;
      slot.setAttribute("aria-hidden", String(locked));
      if (locked && guest.active) {
        guest.active = false;
        guest.serving = false;
        guest.order = null;
        guest.customerId = null;
      }
    });
    Appliances?.forEach(appliance => {
      const element = $(`[data-id="${appliance.id}"]`);
      if (!element) return;
      const locked = !isApplianceUnlocked(appliance, level);
      element.hidden = locked;
      element.setAttribute("aria-hidden", String(locked));
      if (locked && appliance.state !== "empty") resetAppliance(appliance);
    });
    const left = $("#cookLeft");
    const right = $("#cookRight");
    if (left) left.dataset.visible = String(stationCounts.pot);
    if (right) right.dataset.visible = String(stationCounts.grill + stationCounts.oden);
    const takeoutBoard = $("#takeoutBoard");
    if (takeoutBoard) {
      takeoutBoard.hidden = takeoutCapacity === 0;
      takeoutBoard.dataset.capacity = String(takeoutCapacity);
      TakeoutOrders?.forEach(order => {
        const element = $(`[data-takeout="${order.index}"]`);
        if (!element) return;
        const locked = order.index >= takeoutCapacity;
        element.hidden = locked;
        if (locked) resetTakeoutOrder(order, false);
      });
      renderTakeoutQueue();
    }
    const completionPass = $("#completionPass");
    if (completionPass) {
      completionPass.hidden = passCapacity === 0;
      completionPass.dataset.capacity = String(passCapacity);
      CompletionPassSlots?.forEach(slot => {
        const element = $(`[data-pass-slot="${slot.index}"]`);
        if (!element) return;
        const locked = slot.index >= passCapacity;
        element.hidden = locked;
        if (locked) clearPassSlot(slot.index, false);
      });
    }
    InventoryCategories?.forEach(category => renderDockCategory(category.id));
    resize();
    if ($("#boreumi")?.dataset.mode === "idle") setBoreumiIdlePosition();
  }

  function stationLevel(type) {
    return Math.max(1, Math.min(5, Progress.stationLevels[type] || 1));
  }

  function effectiveCookMs(recipe) {
    const upgrade = StationUpgradeCatalog[recipe.appliance];
    return Math.round(recipe.cookMs * upgrade.speed[stationLevel(recipe.appliance) - 1]);
  }

  function effectiveBurnMs(recipe) {
    if (!Config.cooking.burns || !recipe.burns) return 0;
    const upgrade = StationUpgradeCatalog[recipe.appliance];
    return recipe.burnMs + upgrade.burnBonus[stationLevel(recipe.appliance) - 1];
  }

  function effectivePatienceMs() {
    const dayPressure = Math.min(8000, Math.max(0, Progress.day - 1) * 500);
    return Math.max(32000, Config.guests.patienceMs - dayPressure);
  }

  function arrivalDelay(baseDelay) {
    const dayFactor = Math.max(.76, 1 - Math.max(0, Progress.day - 1) * .025);
    return Math.max(500, Math.round(baseDelay * dayFactor));
  }

  const IngredientRules = Object.freeze({
    noodle: Object.freeze({ appliance: "pot", mode: "base" }),
    egg: Object.freeze({ appliance: "pot", mode: "addon", requires: "noodle" }),
    scallion: Object.freeze({ appliance: "pot", mode: "addon", requires: "noodle" }),
    kimchi: Object.freeze({ appliance: "pot", mode: "addon", requires: "noodle" }),
    cheese: Object.freeze({ appliance: "pot", mode: "addon", requires: "noodle" }),
    dumpling: Object.freeze({ appliance: "grill", mode: "base" }),
    oden: Object.freeze({ appliance: "oden", mode: "base" })
  });

  const InventoryCategories = [
    {
      id: "ramen",
      label: "라면 재료",
      className: "ingredient-rack",
      items: ["noodle", "egg", "scallion", "kimchi", "cheese"].map(id => ({ ...IngredientCatalog[id], draggable: true }))
    },
    {
      id: "drinks",
      label: "주류",
      className: "drink-rack",
      items: ["soju", "beer", "somaek", "makgeolli"].map(id => ({ ...IngredientCatalog[id], draggable: true }))
    },
    {
      id: "anju",
      label: "안주",
      className: "snack-rack",
      items: ["dumpling", "oden"].map(id => ({ ...IngredientCatalog[id], draggable: true }))
    }
  ];

  const InventoryPages = Object.fromEntries(InventoryCategories.map(category => [category.id, 0]));

  const State = {
    running: false,
    paused: false,
    closing: false,
    tutorialMode: false,
    helpPausedGame: false,
    journalPausedGame: false,
    recipePausedGame: false,
    supplyPausedGame: false,
    journalCustomerId: null,
    storyDialogueQueue: [],
    storyDialogueTimer: null,
    time: Config.daySeconds,
    sales: 0,
    guests: 0,
    drag: null,
    dayTimer: null,
    cookingTimer: null,
    cookingClock: performance.now(),
    patienceTimer: null,
    guestClock: performance.now(),
    guestTimers: [],
    takeoutTimers: [],
    boreumiTimer: null,
    waste: 0,
    served: 0,
    missed: 0,
    takeoutServed: 0,
    takeoutMissed: 0,
    takeoutPenalty: 0,
    takeoutSerial: 0,
    ratings: { happy: 0, okay: 0, tired: 0 },
    lastSettlement: null,
    dayStories: []
  };

  const Sound = {
    enabled: (() => {
      try {
        const current = localStorage.getItem(AudioPreferenceKey);
        const legacyKey = !current && !IsQA ? LegacyAudioPreferenceKeys.find(key => localStorage.getItem(key)) : null;
        const migrated = legacyKey ? localStorage.getItem(legacyKey) : current;
        return migrated !== "off";
      }
      catch { return true; }
    })(),
    context: null,
    bgmTimer: null,
    bgmStep: 0,
    ensure() {
      if (!this.enabled || IsQA) return null;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.context) this.context = new AudioContextClass();
      if (this.context.state === "suspended") this.context.resume().catch(() => undefined);
      return this.context;
    },
    tone(frequency, duration = .18, volume = .025, type = "sine", delay = 0) {
      const context = this.ensure();
      if (!context) return;
      const startAt = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), startAt + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + .03);
    },
    noise(duration = .12, volume = .018) {
      const context = this.ensure();
      if (!context) return;
      const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, frameCount, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain).connect(context.destination);
      source.start();
    },
    sfx(name) {
      if (!this.enabled) return;
      if (name === "cook") { this.noise(.11, .012); this.tone(392, .11, .018, "triangle"); }
      else if (name === "drop") { this.tone(520, .1, .022, "triangle"); }
      else if (name === "complete") { this.tone(659, .26, .025, "sine"); this.tone(880, .34, .022, "sine", .1); }
      else if (name === "serve") { this.tone(880, .16, .026, "triangle"); this.tone(1175, .2, .02, "triangle", .07); }
      else if (name === "guest") { this.tone(392, .17, .016, "sine"); this.tone(523, .2, .014, "sine", .08); }
      else if (name === "burn") { this.noise(.28, .028); this.tone(146, .34, .03, "sawtooth"); }
      else if (name === "wrong") { this.tone(196, .2, .025, "square"); }
      else if (name === "discard") { this.noise(.09, .018); this.tone(262, .1, .015, "triangle"); }
      else if (name === "upgrade") { [523, 659, 784].forEach((note, index) => this.tone(note, .34, .018, "sine", index * .07)); }
      else if (name === "finish") { [392, 494, 587, 784].forEach((note, index) => this.tone(note, .5, .016, "sine", index * .11)); }
    },
    haptic(pattern = 10) {
      if (!this.enabled || typeof navigator.vibrate !== "function") return;
      navigator.vibrate(pattern);
    },
    playBgmBeat() {
      const melody = [262, 330, 392, 330, 294, 392, 440, 392];
      const note = melody[this.bgmStep++ % melody.length];
      this.tone(note, 1.25, .009, "sine");
      this.tone(note / 2, 1.45, .006, "triangle");
    },
    startBgm() {
      if (!this.enabled || !State.running || State.paused || this.bgmTimer) return;
      if (!this.ensure()) return;
      this.playBgmBeat();
      this.bgmTimer = setInterval(() => this.playBgmBeat(), 1450);
    },
    stopBgm() {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    },
    syncButton() {
      const button = $("#soundButton");
      if (!button) return;
      button.setAttribute("aria-pressed", String(this.enabled));
      button.setAttribute("aria-label", this.enabled ? "소리 끄기" : "소리 켜기");
      button.querySelector("span").textContent = this.enabled ? "♪" : "♩";
      $("#stage").dataset.audio = this.enabled ? "on" : "off";
    },
    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      try { localStorage.setItem(AudioPreferenceKey, this.enabled ? "on" : "off"); } catch { /* Preference remains in memory. */ }
      this.syncButton();
      if (this.enabled) {
        this.ensure();
        this.startBgm();
        this.sfx("drop");
      } else {
        this.stopBgm();
      }
    }
  };

  const Appliances = [
    ...Array.from({ length: 3 }, (_, index) => ({ id: `pot-${index}`, type: "pot", slot: index, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0, servingsShown: 0 })),
    ...Array.from({ length: 2 }, (_, index) => ({ id: `grill-${index}`, type: "grill", slot: index, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0, servingsShown: 0 })),
    { id: "oden-0", type: "oden", slot: 0, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0, servingsShown: 0 }
  ];

  const Guests = Array.from({ length: Config.layout.futureGuestCapacity }, (_, index) => ({
    index,
    customerId: null,
    active: false,
    serving: false,
    order: null,
    patience: 0,
    maxPatience: Config.guests.patienceMs,
    satisfaction: "waiting"
  }));

  const TakeoutOrders = Array.from({ length: 3 }, (_, index) => ({
    index,
    serial: 0,
    active: false,
    packed: false,
    missed: false,
    items: [],
    patience: 0,
    maxPatience: Config.takeout.patienceMs
  }));

  const CompletionPassSlots = Array.from({ length: 4 }, (_, index) => ({
    index,
    recipeId: null
  }));

  const Tutorial = {
    active: false,
    step: null,
    closeTimer: null,
    completed: (() => {
      try {
        const current = localStorage.getItem(TutorialPreferenceKey);
        if (current === "done") return true;
        return !IsQA && LegacyTutorialPreferenceKeys.some(key => localStorage.getItem(key) === "done");
      }
      catch { return false; }
    })(),
    steps: Object.freeze({
      welcome: Object.freeze({ order: 1, eyebrow: "연습 포차 · 1/7", title: "보름이의 연습 포차에 어서 오세요", text: "실제 영업과 분리된 연습이에요. DAY 시간과 손님 인내심은 줄어들지 않아요." }),
      waitGuest: Object.freeze({ order: 2, eyebrow: "주문 확인 · 2/7", title: "연습 손님의 주문을 확인해요", text: "첫 손님은 기본 라면과 소주를 주문했어요. 이 주문은 튜토리얼 동안 바뀌지 않아요." }),
      addNoodle: Object.freeze({ order: 3, eyebrow: "라면 조리 · 3/7", title: "면을 냄비에 넣어주세요", text: "하단의 면 일러스트를 빈 냄비까지 끌어서 놓으면 조리가 즉시 시작돼요." }),
      waitCooking: Object.freeze({ order: 4, eyebrow: "조리 기다리기 · 4/7", title: "진행 막대를 확인하세요", text: "보름이가 조리하는 동안 다른 주문을 준비할 수 있어요. 완성 후에는 타기 전에 서빙해요." }),
      serveFood: Object.freeze({ order: 5, eyebrow: "음식 서빙 · 5/7", title: "완성된 라면을 손님에게", text: "완성 라면을 주문한 손님 캐릭터나 말풍선까지 끌어서 전달해 주세요." }),
      serveDrink: Object.freeze({ order: 6, eyebrow: "주류 서빙 · 6/7", title: "남은 주류도 전달해요", text: "하단 주류 진열대에서 주문한 술을 같은 손님에게 끌어다 놓으면 주문이 완성돼요." }),
      stockInfo: Object.freeze({ order: 7, eyebrow: "재고와 구매 · 7/7", title: "재료 수량도 챙겨주세요", text: "하단 숫자가 남은 재고예요. 실제 영업이 끝나면 정산 화면의 재료 상점에서 1개·5개·가득 구매할 수 있어요." }),
      done: Object.freeze({ order: 8, eyebrow: "첫 주문 완료!", title: "이제 포차를 맡겨도 되겠어요", text: "완성·탄 음식은 짧게 누르면 즉시 폐기돼요. 메뉴 수첩에서 조합과 해금 조건도 확인할 수 있어요." })
    }),
    clearFocus() {
      $$(".tutorial-focus").forEach(element => element.classList.remove("tutorial-focus"));
      const path = $("#tutorialPath");
      path?.classList.add("hidden");
      path?.style.removeProperty("left");
      path?.style.removeProperty("top");
      path?.style.removeProperty("width");
      path?.style.removeProperty("transform");
    },
    activeGuest() {
      return Guests.find(guest => guest.active && !guest.serving) || null;
    },
    elementsForStep() {
      const guest = this.activeGuest();
      if (this.step === "welcome") return { focus: [$("#tutorialStageBadge")] };
      if (this.step === "waitGuest") return { focus: [guest ? $(`[data-guest="${guest.index}"]`) : $("#guestRow")] };
      if (this.step === "addNoodle") {
        const source = $('.ingredient[data-item="noodle"]');
        const target = $$('.appliance.pot').find(element => element.dataset.state === "empty") || $('.appliance.pot');
        return { source, target, focus: [source, target] };
      }
      if (this.step === "waitCooking") {
        const target = $$('.appliance.pot').find(element => element.dataset.state === "cooking") || $('.appliance.pot');
        return { focus: [target] };
      }
      if (this.step === "serveFood") {
        const source = $$('.appliance.pot').find(element => element.dataset.state === "ready");
        const target = guest ? $(`[data-guest="${guest.index}"]`) : $("#guestRow");
        return { source, target, focus: [source, target] };
      }
      if (this.step === "serveDrink") {
        const pendingDrink = guest?.order?.items.find(item => !item.fulfilled && MenuCatalog[item.id]?.kind === "drink");
        const source = pendingDrink ? $(`.ingredient[data-item="${pendingDrink.id}"]`) : $('.ingredient[data-kind="drink"]');
        const target = guest ? $(`[data-guest="${guest.index}"]`) : $("#guestRow");
        return { source, target, focus: [source, target] };
      }
      return { focus: [] };
    },
    layoutPath() {
      if (!this.active) return;
      const { source, target } = this.elementsForStep();
      const path = $("#tutorialPath");
      if (!source || !target || !path) return path?.classList.add("hidden");
      const start = stagePointFor(source);
      const end = stagePointFor(target);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      path.style.left = `${start.x}px`;
      path.style.top = `${start.y}px`;
      path.style.width = `${Math.max(48, Math.hypot(dx, dy))}px`;
      path.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      path.classList.remove("hidden");
    },
    render() {
      this.clearFocus();
      const coach = $("#tutorialCoach");
      if (!this.active || !this.steps[this.step]) return coach?.classList.add("hidden");
      const copy = this.steps[this.step];
      $("#tutorialStep").textContent = copy.eyebrow;
      $("#tutorialTitle").textContent = copy.title;
      $("#tutorialText").textContent = copy.text;
      const actionVisible = ["welcome", "waitGuest", "stockInfo", "done"].includes(this.step);
      $("#tutorialActionButton").classList.toggle("hidden", !actionVisible);
      $("#tutorialActionButton").textContent = this.step === "welcome" ? "주문 확인" : this.step === "waitGuest" ? "조리 연습 시작" : this.step === "stockInfo" ? "연습 마치기" : "영업 화면으로";
      $("#tutorialSkipButton").classList.toggle("hidden", this.step === "done");
      coach.classList.remove("hidden");
      this.elementsForStep().focus.filter(Boolean).forEach(element => element.classList.add("tutorial-focus"));
      this.layoutPath();
      requestAnimationFrame(() => this.layoutPath());
    },
    setStep(step) {
      if (!this.steps[step]) return;
      this.step = step;
      this.render();
      Sound.sfx(step === "done" ? "upgrade" : "drop");
    },
    inferStep() {
      if (!State.tutorialMode) return "welcome";
      const guest = this.activeGuest();
      if (!guest) return "waitGuest";
      const readyPot = Appliances.some(appliance => appliance.type === "pot" && appliance.state === "ready");
      if (readyPot) return "serveFood";
      const cookingPot = Appliances.some(appliance => appliance.type === "pot" && appliance.state === "cooking");
      if (cookingPot) return "waitCooking";
      const pendingFood = guest.order?.items.some(item => !item.fulfilled && MenuCatalog[item.id]?.kind === "food");
      return pendingFood ? "addNoodle" : "serveDrink";
    },
    enterPractice() {
      clearInterval(State.dayTimer);
      clearGuestTimers();
      clearTakeoutTimers();
      resetGuests();
      resetTakeoutOrders();
      resetCompletionPass();
      Appliances.forEach(resetAppliance);
      State.running = true;
      State.paused = false;
      State.tutorialMode = true;
      State.time = Config.daySeconds;
      State.sales = 0;
      State.guests = 1;
      State.waste = 0;
      State.served = 0;
      State.missed = 0;
      State.takeoutServed = 0;
      State.takeoutMissed = 0;
      State.takeoutPenalty = 0;
      State.ratings = { happy: 0, okay: 0, tired: 0 };
      State.cookingClock = performance.now();
      State.guestClock = performance.now();
      const guest = Guests[0];
      guest.customerId = CustomerById.office ? "office" : CustomerCatalog[0].id;
      guest.active = true;
      guest.serving = false;
      guest.satisfaction = "waiting";
      guest.maxPatience = Config.guests.patienceMs;
      guest.patience = guest.maxPatience;
      guest.order = createOrder("ramen_plain", "soju");
      renderGuest(guest);
      $("#stage").dataset.tutorial = "true";
      $("#tutorialStageBadge").hidden = false;
      $(".hud").classList.add("running");
      $("#startButton").disabled = true;
      $("#startButton").setAttribute("aria-label", "연습중");
      $("#startButton strong").textContent = "연습중";
      InventoryCategories.forEach(category => renderDockCategory(category.id));
      renderHud();
      setBoreumiIdle();
    },
    exitPractice() {
      if (!State.tutorialMode) return;
      clearInterval(State.dayTimer);
      clearGuestTimers();
      clearTakeoutTimers();
      Sound.stopBgm();
      State.running = false;
      State.paused = false;
      State.tutorialMode = false;
      State.time = Config.daySeconds;
      State.sales = 0;
      State.guests = 0;
      State.waste = 0;
      State.served = 0;
      State.missed = 0;
      State.takeoutServed = 0;
      State.takeoutMissed = 0;
      State.takeoutPenalty = 0;
      State.ratings = { happy: 0, okay: 0, tired: 0 };
      resetGuests();
      resetTakeoutOrders();
      resetCompletionPass();
      Appliances.forEach(resetAppliance);
      $("#stage").dataset.tutorial = "false";
      $("#tutorialStageBadge").hidden = true;
      $(".hud").classList.remove("running");
      $("#startButton").disabled = false;
      $("#startButton").setAttribute("aria-label", "영업 시작");
      $("#startButton strong").textContent = "영업 시작";
      InventoryCategories.forEach(category => renderDockCategory(category.id));
      renderHud();
      setBoreumiIdle();
      if (this.completed) announceFirstDayReady();
    },
    start() {
      clearTimeout(this.closeTimer);
      if (State.running && !State.tutorialMode) {
        toast("현재 영업을 마친 뒤 연습 포차를 이용해 주세요.");
        return false;
      }
      $("#helpOverlay")?.classList.add("hidden");
      this.enterPractice();
      this.active = true;
      this.setStep("welcome");
      return true;
    },
    advance() {
      if (this.step === "welcome") this.setStep("waitGuest");
      else if (this.step === "waitGuest") this.setStep("addNoodle");
      else if (this.step === "stockInfo") this.complete();
      else if (this.step === "done") this.close(false);
    },
    close(markComplete = false) {
      clearTimeout(this.closeTimer);
      if (markComplete) {
        this.completed = true;
        try { localStorage.setItem(TutorialPreferenceKey, "done"); } catch { /* Tutorial status remains in memory. */ }
      }
      this.active = false;
      this.step = null;
      this.clearFocus();
      $("#tutorialCoach")?.classList.add("hidden");
      this.exitPractice();
    },
    complete() {
      this.completed = true;
      try { localStorage.setItem(TutorialPreferenceKey, "done"); } catch { /* Tutorial status remains in memory. */ }
      this.setStep("done");
    },
    handle(event, data = {}) {
      if (!this.active) return;
      if (event === "cooking" && this.step === "addNoodle" && data.appliance?.type === "pot") this.setStep("waitCooking");
      else if (event === "ready" && this.step === "waitCooking" && data.appliance?.type === "pot") this.setStep("serveFood");
      else if (event === "served" && this.step === "serveFood" && data.kind === "food") this.setStep("serveDrink");
      else if (event === "served" && this.step === "serveDrink" && data.kind === "drink") this.setStep("stockInfo");
    },
    scheduleFirstRun() {
      const forced = new URLSearchParams(location.search).has("tutorial");
      if (IsQA || IsDev || (this.completed && !forced)) return;
      const launch = () => setTimeout(() => {
        if (!$("#helpOverlay").classList.contains("hidden")) return;
        this.start();
      }, 260);
      if (window.BoreumiBoot?.state.complete) launch();
      else window.addEventListener("boreumi:ready", launch, { once: true });
    }
  };

  function assetUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function recipeFor(appliance) {
    return appliance?.recipeId ? RecipeCatalog[appliance.recipeId] : null;
  }

  function resolveRecipeId(appliance) {
    if (appliance.type === "pot") {
      const keys = [...appliance.ingredients].sort().join("|");
      const match = Object.values(RecipeCatalog).find(recipe => recipe.appliance === "pot" && [...recipe.ingredients].sort().join("|") === keys);
      return match?.id || null;
    }
    if (appliance.type === "grill") return "grilled_dumpling";
    return "warm_oden";
  }

  function foodArtFor(appliance) {
    return recipeFor(appliance)?.art || FoodArt[appliance.type];
  }

  function renderDockCategory(categoryId) {
    const category = InventoryCategories.find(entry => entry.id === categoryId);
    const rack = $(`[data-category="${categoryId}"]`);
    if (!category || !rack) return;
    const pageSize = Config.layout.inventoryPageSize;
    const pageCount = Math.max(1, Math.ceil(category.items.length / pageSize));
    const page = Math.max(0, Math.min(InventoryPages[categoryId], pageCount - 1));
    InventoryPages[categoryId] = page;
    const visibleItems = category.items.slice(page * pageSize, (page + 1) * pageSize);
    const items = rack.querySelector(".rack-items");
    items.style.setProperty("--page-columns", Math.max(2, visibleItems.length));
    items.innerHTML = visibleItems.map(item => {
      const unlocked = isIngredientUnlocked(item.id);
      const stock = ingredientStock(item.id);
      const disabled = !unlocked || (!State.tutorialMode && stock <= 0);
      const status = unlocked ? `재고 ${stock}개` : `포차 LV.${item.unlockLevel} 해금`;
      return `<button class="ingredient catalog-item${item.kind === "drink" ? " drink-item" : ""}${unlocked ? "" : " locked"}${stock <= 0 ? " sold-out" : ""}" data-item="${item.id}" data-kind="${item.kind || "ingredient"}" aria-label="${item.label} · ${status}" ${disabled ? "disabled" : ""}><img src="${item.art}" alt=""><span class="item-name">${item.label}</span><b class="stock-count">${unlocked ? stock : `LV.${item.unlockLevel}`}</b></button>`;
    }).join("");
    const prev = rack.querySelector(".rack-prev");
    const next = rack.querySelector(".rack-next");
    const index = rack.querySelector(".rack-page-index");
    prev.hidden = next.hidden = index.hidden = pageCount === 1;
    prev.disabled = page === 0;
    next.disabled = page === pageCount - 1;
    index.textContent = `${page + 1}/${pageCount}`;
    rack.querySelectorAll(".ingredient").forEach(bindDrag);
  }

  function buildDock() {
    const dock = $(".dock");
    dock.replaceChildren();
    InventoryCategories.forEach(category => {
      const visibleSlots = Math.max(2, Math.min(Config.layout.inventoryPageSize, category.items.length));
      const rack = document.createElement("section");
      rack.className = `inventory-rack ${category.className}`;
      rack.dataset.category = category.id;
      rack.dataset.pageSize = String(Config.layout.inventoryPageSize);
      rack.style.setProperty("--visible-slots", visibleSlots);
      rack.setAttribute("aria-label", `${category.label} 진열대`);
      rack.innerHTML = `<h3 class="rack-title">${category.label}</h3><button type="button" class="rack-page rack-prev" aria-label="${category.label} 이전 페이지">‹</button><div class="rack-items"></div><span class="rack-page-index" aria-live="polite"></span><button type="button" class="rack-page rack-next" aria-label="${category.label} 다음 페이지">›</button>`;
      dock.append(rack);
      rack.querySelector(".rack-prev").addEventListener("click", () => {
        InventoryPages[category.id] -= 1;
        renderDockCategory(category.id);
      });
      rack.querySelector(".rack-next").addEventListener("click", () => {
        InventoryPages[category.id] += 1;
        renderDockCategory(category.id);
      });
      renderDockCategory(category.id);
    });
  }

  function buildTakeoutAndPass() {
    const orderList = $("#takeoutOrders");
    orderList.replaceChildren();
    TakeoutOrders.forEach(order => {
      orderList.insertAdjacentHTML("beforeend", `<article class="takeout-order" data-takeout="${order.index}" aria-label="포장 주문 ${order.index + 1}" hidden><span class="ticket-number">대기</span><div class="takeout-items"></div><span class="package-preview" aria-hidden="true"></span><span class="takeout-patience"><i></i></span></article>`);
    });
    const pass = $("#passSlots");
    pass.replaceChildren();
    CompletionPassSlots.forEach(slot => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pass-slot empty";
      button.dataset.passSlot = String(slot.index);
      button.setAttribute("aria-label", `완성대 ${slot.index + 1} · 비어 있음`);
      button.hidden = true;
      pass.append(button);
      bindDrag(button);
    });
  }

  function build() {
    buildDock();
    buildTakeoutAndPass();
    const left = $("#cookLeft");
    const right = $("#cookRight");

    Appliances.forEach(appliance => {
      const button = document.createElement("button");
      button.className = `appliance ${appliance.type}`;
      button.dataset.id = appliance.id;
      button.setAttribute("aria-label", appliance.type === "pot" ? `냄비 ${appliance.slot + 1}` : appliance.type === "grill" ? `그릴 ${appliance.slot + 1}` : "오뎅바");
      button.innerHTML = `<span class="art"></span><span class="bar"><i></i></span>`;
      (appliance.type === "pot" ? left : right).append(button);
    });

    const row = $("#guestRow");
    Guests.forEach(guest => {
      row.insertAdjacentHTML("beforeend", `<article class="guest-slot" data-guest="${guest.index}"><div class="bubble" aria-label="주문"><div class="order-items"></div><span class="satisfaction" aria-hidden="true"></span></div><div class="guest-seat" role="img" aria-label="빈 의자"></div><div class="guest-art" role="img" aria-label="방문 손님"></div><div class="patience" aria-label="손님 인내심"><i></i></div></article>`);
    });

    applyStallLevel();
    renderAll();
    Guests.forEach(renderGuest);
  }

  function resize() {
    const viewport = window.visualViewport || window;
    const stage = $("#stage");
    const logicalViewport = window.BoreumiPWA?.logicalViewport || { width: viewport.width, height: viewport.height };
    const viewportElement = $("#viewport");
    const viewportStyle = getComputedStyle(viewportElement);
    const reservedWidth =
      (Number.parseFloat(viewportStyle.paddingLeft) || 0) +
      (Number.parseFloat(viewportStyle.paddingRight) || 0);
    const reservedHeight =
      (Number.parseFloat(viewportStyle.paddingTop) || 0) +
      (Number.parseFloat(viewportStyle.paddingBottom) || 0);
    const usableWidth = Math.max(1, logicalViewport.width - reservedWidth);
    const usableHeight = Math.max(1, logicalViewport.height - reservedHeight);
    const viewportRatio = logicalViewport.width / logicalViewport.height;
    const adaptiveWidth = Math.round(Config.stage.height * viewportRatio);
    const requiredWidth = stageWidthForCapacity();
    const stageWidth = Math.max(requiredWidth, Math.min(Config.stage.maxWidth, adaptiveWidth));
    const scale = Math.min(usableWidth / stageWidth, usableHeight / Config.stage.height);
    Config.stage.currentWidth = stageWidth;
    stage.style.width = `${stageWidth}px`;
    stage.style.setProperty("--stage-width", `${stageWidth}px`);
    stage.style.setProperty("--safe-left", `${(stageWidth - Config.stage.safeWidth) / 2}px`);
    stage.dataset.viewport = stageWidth > Config.stage.safeWidth ? "expanded" : "safe";
    stage.dataset.layoutWidth = String(requiredWidth);
    stage.style.transform = `scale(${scale})`;
    if ($("#boreumi")?.dataset.mode === "idle") setBoreumiIdlePosition();
    Tutorial?.layoutPath?.();
  }

  function money(value) {
    return value.toLocaleString("ko-KR") + "원";
  }

  function cumulativeSales() {
    if (State.tutorialMode) return Progress.stats.totalSales;
    return Progress.stats.totalSales + (State.running ? State.sales : 0);
  }

  function renderHud() {
    const dayText = String(effectiveDay());
    $("#dayNumber").textContent = dayText;
    $("#stage").dataset.dayDigits = String(dayText.length);
    $("#goalAmount").textContent = State.tutorialMode ? "저장 안 됨" : money(cumulativeSales());
    $("#time").textContent = State.tutorialMode ? "시간 정지" : `${String(Math.floor(State.time / 60)).padStart(2, "0")}:${String(State.time % 60).padStart(2, "0")}`;
    $("#timeFill").style.width = State.tutorialMode ? "100%" : `${State.time / Config.daySeconds * 100}%`;
    $("#sales").textContent = State.tutorialMode ? "저장 안 됨" : money(State.sales);
    $("#guestCount").textContent = State.tutorialMode ? "연습 1명" : State.guests + "명";
    $("#stallLevel").textContent = String(effectiveStallLevel());
    $("#walletGold").textContent = money(Progress.gold);
    renderJournalBadge();
    renderDevTools();
  }

  function toast(text) {
    const element = $("#toast");
    element.textContent = text;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 1300);
  }

  function say(text) {
    const element = $("#boreumiText");
    element.textContent = text;
    element.classList.add("show");
    clearTimeout(say.timer);
    say.timer = setTimeout(() => element.classList.remove("show"), 1100);
  }

  function stagePointFor(element) {
    const stage = $("#stage");
    const stageRect = stage.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const scale = stageRect.width / Config.stage.currentWidth || 1;
    return {
      x: (targetRect.left + targetRect.width / 2 - stageRect.left) / scale,
      y: (targetRect.top + targetRect.height * .48 - stageRect.top) / scale
    };
  }

  function burstAt(element, kind = "drop", count = 8) {
    if (!element) return;
    const layer = $("#fxLayer");
    const point = stagePointFor(element);
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("i");
      const angle = Math.PI * 2 * index / count + Math.random() * .28;
      const distance = 38 + Math.random() * 42;
      particle.className = `fx-particle ${kind}`;
      particle.style.setProperty("--x", `${point.x}px`);
      particle.style.setProperty("--y", `${point.y}px`);
      particle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
      layer.append(particle);
      setTimeout(() => particle.remove(), 900);
    }
  }

  function floatFeedback(element, text, kind = "sale") {
    if (!element) return;
    const point = stagePointFor(element);
    const feedback = document.createElement("strong");
    feedback.className = `float-feedback ${kind}`;
    feedback.textContent = text;
    feedback.style.setProperty("--x", `${point.x}px`);
    feedback.style.setProperty("--y", `${point.y}px`);
    $("#fxLayer").append(feedback);
    setTimeout(() => feedback.remove(), 1120);
  }

  function spriteFor(appliance) {
    if (appliance.state === "empty") return appliance.type;
    if (appliance.type === "oden" && ["cooking", "ready"].includes(appliance.state)) {
      if (appliance.servingsShown <= 1) return "cooking-oden-one";
      if (appliance.servingsShown === 2) return "cooking-oden-two";
      return "cooking-oden";
    }
    if (appliance.state === "cooking") {
      if (appliance.type === "pot") return recipeFor(appliance)?.cookingSprite || (appliance.ingredients.includes("egg") ? "cooking-ramen-egg" : "cooking-ramen");
      return `cooking-${appliance.type === "grill" ? "dumpling" : "oden"}`;
    }
    return recipeFor(appliance)?.sprite || appliance.type;
  }

  function applianceStateLabel(appliance) {
    if (appliance.state === "empty") return "대기";
    if (appliance.state === "cooking") return "조리 중";
    if (appliance.state === "ready") return "완성";
    return "탄 음식";
  }

  function renderProgress(appliance) {
    const element = $(`[data-id="${appliance.id}"]`);
    if (!element) return;
    const bar = element.querySelector(".bar i");
    const recipe = recipeFor(appliance);
    let progress = 0;
    if (appliance.state === "cooking" && recipe) progress = 1 - appliance.cookRemaining / effectiveCookMs(recipe);
    if (appliance.state === "ready" && recipe) progress = recipe.burns ? appliance.burnRemaining / effectiveBurnMs(recipe) : 1;
    if (appliance.state === "burnt") progress = 1;
    bar.style.transition = "none";
    bar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }

  function renderAppliance(appliance) {
    const element = $(`[data-id="${appliance.id}"]`);
    const art = element.querySelector(".art");
    element.classList.toggle("ready", appliance.state === "ready");
    element.classList.toggle("cooking", appliance.state === "cooking");
    element.classList.toggle("burnt", appliance.state === "burnt");
    element.classList.toggle("keeps-warm", appliance.state === "ready" && recipeFor(appliance)?.burns === false);
    element.dataset.state = appliance.state;
    element.dataset.recipe = appliance.recipeId || "";
    element.dataset.odenCount = appliance.type === "oden" && appliance.state !== "empty" ? String(Math.max(1, appliance.servingsShown || 1)) : "0";
    const odenStatus = appliance.type === "oden" && appliance.state === "ready" ? ` · 계속 서빙 가능 · 오뎅 ${Math.max(1, appliance.servingsShown)}개 보임` : "";
    element.setAttribute("aria-label", `${appliance.type === "pot" ? `냄비 ${appliance.slot + 1}` : appliance.type === "grill" ? `그릴 ${appliance.slot + 1}` : "오뎅바"} · ${applianceStateLabel(appliance)}${odenStatus}`);
    art.innerHTML = `<i class="kitchen-sprite sprite-${spriteFor(appliance)}"></i><span class="cook-fx" aria-hidden="true"><i></i><i></i><i></i></span>`;
    renderProgress(appliance);
  }

  function renderAll() {
    Appliances.forEach(renderAppliance);
    renderHud();
  }

  function createOrder(foodId, drinkId) {
    return {
      id: `${foodId}+${drinkId}`,
      items: [foodId, drinkId].map(id => ({ id, fulfilled: false }))
    };
  }

  function assignOrder(guest) {
    guest.order = createOrder(randomChoice(unlockedFoodOrderPool()), randomChoice(drinkOrderPool()));
  }

  function chooseCustomer() {
    const seated = new Set(Guests.filter(guest => guest.active && guest.customerId).map(guest => guest.customerId));
    const pool = unlockedCustomers();
    const available = pool.filter(customer => !seated.has(customer.id));
    return randomChoice(available.length ? available : pool);
  }

  function regularRecord(customerId) {
    return Progress.regulars[customerId];
  }

  function relationshipInfo(record) {
    if (!record || record.visits <= 0) return { id: "unmet", label: "아직 만나지 못함", next: 1 };
    if (record.served >= 25 || record.affection >= 75) return { id: "family", label: "가족 같은 단골", next: Infinity };
    if (record.served >= 15 || record.affection >= 45) return { id: "old-regular", label: "오래된 단골", next: 25 };
    if (record.served >= 7 || record.affection >= 22) return { id: "regular", label: "단골", next: 15 };
    if (record.served >= 3 || record.affection >= 9) return { id: "familiar", label: "익숙한 손님", next: 7 };
    if (record.served >= 1) return { id: "returning", label: "다시 만난 손님", next: 3 };
    return { id: "hello", label: "첫 인사", next: 1 };
  }

  function favoriteLabel(customerId) {
    const story = CustomerStoryCatalog[customerId];
    if (!story) return "따뜻한 한 끼";
    return MenuCatalog[story.favoriteFood].label + " · " + MenuCatalog[story.favoriteDrink].label;
  }

  function recordCustomerVisit(customerId) {
    const record = regularRecord(customerId);
    record.visits += 1;
    record.lastDay = Progress.day;
  }

  function recordCustomerMissed(customerId) {
    const record = regularRecord(customerId);
    record.missed += 1;
    record.affection = Math.max(0, record.affection - 2);
    record.lastDay = Progress.day;
  }

  function recordCustomerStory(customerId, guest) {
    const customer = CustomerById[customerId];
    const profile = CustomerStoryCatalog[customerId];
    const record = regularRecord(customerId);
    record.served += 1;
    record.affection += guest?.satisfaction === "happy" ? 4 : guest?.satisfaction === "okay" ? 3 : 2;
    record.lastDay = Progress.day;
    const servedFood = guest?.order?.items.find(item => MenuCatalog[item.id]?.kind === "food")?.id;
    const servedDrink = guest?.order?.items.find(item => MenuCatalog[item.id]?.kind === "drink")?.id;
    if (servedFood) record.lastFood = servedFood;
    if (servedDrink) record.lastDrink = servedDrink;
    const served = record.served;
    const uniqueChapter = profile?.chapters[record.chapters];
    const recurringChapter = !uniqueChapter && served >= 25 && served % 25 === 0;
    if ((!uniqueChapter || served < uniqueChapter.required) && !recurringChapter) return null;
    record.chapters += 1;
    const relation = relationshipInfo(record);
    const entry = recurringChapter
      ? {
          day: Progress.day,
          customerId,
          chapter: record.chapters,
          title: served + "번째 따뜻한 밤",
          text: customer.name + "님과 " + served + "번째 식사를 함께했다. 끝이 없는 포차의 시간 속에서 익숙한 안부가 또 하나의 추억이 되었다.",
          relationship: relation.label,
          servedAt: served
        }
      : {
          day: Progress.day,
          customerId,
          chapter: record.chapters,
          title: uniqueChapter.title,
          text: uniqueChapter.text,
          relationship: relation.label,
          servedAt: served
        };
    Progress.storyLog.push(entry);
    Progress.storyLog = Progress.storyLog.slice(-200);
    State.dayStories.push(entry);
    saveProgress();
    renderJournalBadge();
    return entry;
  }

  function queueGuestDialogue(customerId, text, { kind = "arrival", meta = "", title = "" } = {}) {
    if (State.tutorialMode || !CustomerById[customerId] || !text) return;
    State.storyDialogueQueue.push({ customerId, text, kind, meta, title });
    if (!State.storyDialogueTimer && $("#storyWhisper").hidden) showNextGuestDialogue();
  }

  function showNextGuestDialogue() {
    const dialogue = State.storyDialogueQueue.shift();
    const element = $("#storyWhisper");
    if (!dialogue || !element) {
      State.storyDialogueTimer = null;
      return;
    }
    const customer = CustomerById[dialogue.customerId];
    const record = regularRecord(dialogue.customerId);
    const relationship = relationshipInfo(record);
    const positionDialogue = () => {
      const activeGuest = Guests.find(guest => guest.active && guest.customerId === dialogue.customerId);
      if (activeGuest) {
        const slot = document.querySelector('[data-guest="' + activeGuest.index + '"]');
        const guestArt = slot?.querySelector(".guest-art") || slot;
        const stage = $("#stage");
        const stageRect = stage.getBoundingClientRect();
        const guestRect = guestArt.getBoundingClientRect();
        const scale = stageRect.width / stage.offsetWidth || 1;
        const left = Math.max(230, Math.min(stage.offsetWidth - 230, (guestRect.left + guestRect.width / 2 - stageRect.left) / scale));
        const top = Math.max(360, Math.min(555, (guestRect.bottom - stageRect.top) / scale + 8));
        element.style.setProperty("--whisper-x", left + "px");
        element.style.setProperty("--whisper-y", top + "px");
      } else {
        element.style.setProperty("--whisper-x", "50%");
        element.style.setProperty("--whisper-y", "455px");
      }
    };
    positionDialogue();
    element.classList.toggle("episode", dialogue.kind === "episode");
    $("#storyWhisperPortrait").style.backgroundImage = 'url("' + customer.art + '")';
    $("#storyWhisperMeta").textContent = dialogue.meta || relationship.label;
    $("#storyWhisperName").textContent = dialogue.title || customer.name;
    $("#storyWhisperText").textContent = dialogue.text;
    element.hidden = false;
    requestAnimationFrame(() => {
      positionDialogue();
      element.classList.add("show");
    });
    [160, 480, 900].forEach(delay => setTimeout(() => {
      if (!element.hidden && element.classList.contains("show")) positionDialogue();
    }, delay));
    State.storyDialogueTimer = null;
  }

  function dismissGuestDialogue() {
    const element = $("#storyWhisper");
    if (!element || element.hidden || State.storyDialogueTimer) return;
    element.classList.remove("show");
    State.storyDialogueTimer = setTimeout(() => {
      element.hidden = true;
      State.storyDialogueTimer = setTimeout(() => {
        State.storyDialogueTimer = null;
        showNextGuestDialogue();
      }, 420);
    }, 180);
  }

  function clearGuestDialogues() {
    clearTimeout(State.storyDialogueTimer);
    State.storyDialogueTimer = null;
    State.storyDialogueQueue = [];
    const element = $("#storyWhisper");
    if (element) {
      element.classList.remove("show", "episode");
      element.hidden = true;
    }
  }

  function pendingItems(guest) {
    return guest.order?.items.filter(item => !item.fulfilled) || [];
  }

  function renderPatience(guest) {
    const slot = $(`[data-guest="${guest.index}"]`);
    if (!slot) return;
    const patience = slot.querySelector(".patience");
    if (Config.guests.waitsForever) {
      patience.hidden = true;
      patience.setAttribute("aria-label", "손님은 주문이 모두 나올 때까지 기다립니다");
      slot.classList.remove("low-patience");
      return;
    }
    const ratio = guest.maxPatience ? Math.max(0, Math.min(1, guest.patience / guest.maxPatience)) : 0;
    patience.hidden = false;
    patience.querySelector("i").style.width = `${ratio * 100}%`;
    slot.classList.toggle("low-patience", guest.active && ratio <= .3);
    patience.setAttribute("aria-label", `손님 인내심 ${Math.round(ratio * 100)}%`);
  }

  function renderGuest(guest) {
    const slot = $(`[data-guest="${guest.index}"]`);
    const customer = CustomerById[guest.customerId];
    slot.classList.toggle("active", guest.active);
    slot.classList.toggle("serving", guest.serving);
    slot.dataset.satisfaction = guest.satisfaction;
    slot.classList.toggle("satisfied", ["happy", "okay", "tired"].includes(guest.satisfaction));
    slot.classList.toggle("angry", guest.satisfaction === "angry");
    slot.dataset.customer = customer?.id || "";
    const guestArt = slot.querySelector(".guest-art");
    guestArt.style.backgroundImage = customer ? `url("${customer.art}")` : "none";
    guestArt.setAttribute("aria-label", customer?.name || "방문 손님");
    const items = slot.querySelector(".order-items");
    const orderItems = guest.order?.items || [];
    items.innerHTML = orderItems.map((orderItem, index) => {
      const menuItem = MenuCatalog[orderItem.id];
      const itemHtml = `<span class="order-item${orderItem.fulfilled ? " fulfilled" : ""}" data-order-item="${orderItem.id}" aria-label="${menuItem.label}${orderItem.fulfilled ? " 전달 완료" : " 대기"}"><img src="${menuItem.art}" alt="${menuItem.label}"></span>`;
      return index < orderItems.length - 1 ? `${itemHtml}<b class="order-plus" aria-hidden="true">+</b>` : itemHtml;
    }).join("");
    const satisfaction = slot.querySelector(".satisfaction");
    satisfaction.textContent = guest.satisfaction === "happy" ? "♥" : guest.satisfaction === "okay" ? "✓" : guest.satisfaction === "tired" ? "…" : guest.satisfaction === "angry" ? "!" : "";
    renderPatience(guest);
  }

  function menuPriceWithUpgrade(itemId) {
    const menuItem = MenuCatalog[itemId];
    const applianceType = RecipeCatalog[itemId]?.appliance;
    if (!applianceType) return menuItem.price;
    const upgrade = StationUpgradeCatalog[applianceType];
    const bonus = upgrade.priceBonus[stationLevel(applianceType) - 1];
    return Math.round(menuItem.price * (1 + bonus));
  }

  function createTakeoutItems() {
    const level = effectiveStallLevel();
    const ids = [randomChoice(unlockedFoodOrderPool(level))];
    if (level >= 4 || (level >= 3 && randomUnit() < .5)) ids.push(randomChoice(drinkOrderPool()));
    return ids.map(id => ({ id, fulfilled: false }));
  }

  function renderTakeoutQueue() {
    const capacity = takeoutCapacityForLevel();
    const active = TakeoutOrders.filter(order => order.index < capacity && order.active).length;
    const badge = $("#takeoutQueue");
    if (badge) badge.textContent = `${active}/${capacity}`;
  }

  function renderTakeoutOrder(order) {
    const element = $(`[data-takeout="${order.index}"]`);
    if (!element) return;
    const locked = order.index >= takeoutCapacityForLevel();
    element.hidden = locked;
    element.classList.toggle("active", order.active);
    element.classList.toggle("packed", order.packed);
    element.classList.toggle("missed", order.missed);
    element.classList.toggle("partly-packed", order.active && order.items.some(item => item.fulfilled));
    element.querySelector(".ticket-number").textContent = order.active ? `#${String(order.serial).padStart(2, "0")}` : "대기";
    const items = element.querySelector(".takeout-items");
    items.innerHTML = order.active ? order.items.map((item, index) => {
      const menuItem = MenuCatalog[item.id];
      const itemHtml = `<span class="takeout-item${item.fulfilled ? " fulfilled" : ""}" data-takeout-item="${item.id}" aria-label="${menuItem.label}${item.fulfilled ? " 포장 완료" : " 대기"}"><img src="${menuItem.art}" alt="${menuItem.label}"></span>`;
      return index < order.items.length - 1 ? `${itemHtml}<b class="takeout-plus" aria-hidden="true">+</b>` : itemHtml;
    }).join("") : `<small>${order.missed ? "주문 취소" : "주문 대기"}</small>`;
    const ratio = order.maxPatience ? Math.max(0, Math.min(1, order.patience / order.maxPatience)) : 0;
    element.querySelector(".takeout-patience i").style.width = `${ratio * 100}%`;
    element.classList.toggle("low-patience", order.active && ratio <= .3);
    element.setAttribute("aria-label", order.active ? `포장 주문 ${order.serial} · 남은 시간 ${Math.round(ratio * 100)}%` : "빈 포장 주문 칸");
    renderTakeoutQueue();
  }

  function renderPassSlot(index) {
    const slot = CompletionPassSlots[index];
    const element = $(`[data-pass-slot="${index}"]`);
    if (!slot || !element) return;
    const locked = index >= completionPassCapacityForLevel();
    element.hidden = locked;
    element.classList.toggle("empty", !slot.recipeId);
    element.classList.toggle("ready", Boolean(slot.recipeId));
    element.replaceChildren();
    if (slot.recipeId) {
      const image = document.createElement("img");
      image.src = MenuCatalog[slot.recipeId].art;
      image.alt = MenuCatalog[slot.recipeId].label;
      element.append(image);
    }
    element.setAttribute("aria-label", slot.recipeId ? `완성대 ${index + 1} · ${MenuCatalog[slot.recipeId].label}` : `완성대 ${index + 1} · 비어 있음`);
  }

  function clearPassSlot(index, announce = false) {
    const slot = CompletionPassSlots[index];
    if (!slot) return;
    slot.recipeId = null;
    renderPassSlot(index);
    if (announce) toast("완성대를 비웠어요.");
  }

  function resetCompletionPass() {
    CompletionPassSlots.forEach(slot => clearPassSlot(slot.index, false));
  }

  function clearGuestTimers() {
    State.guestTimers.forEach(clearTimeout);
    State.guestTimers = [];
  }

  function clearTakeoutTimers() {
    State.takeoutTimers.forEach(clearTimeout);
    State.takeoutTimers = [];
  }

  function resetTakeoutOrder(order, reschedule = false) {
    if (!order) return;
    order.active = false;
    order.packed = false;
    order.missed = false;
    order.items = [];
    order.patience = 0;
    renderTakeoutOrder(order);
    if (reschedule && State.running && !State.closing && order.index < takeoutCapacityForLevel()) {
      scheduleTakeout(order.index, Config.takeout.repeatDelayMs + order.index * 900);
    }
    checkClosingComplete();
  }

  function resetTakeoutOrders() {
    clearTakeoutTimers();
    TakeoutOrders.forEach(order => resetTakeoutOrder(order, false));
  }

  function scheduleTakeout(index, delay) {
    if (State.closing || index >= takeoutCapacityForLevel()) return;
    const timer = setTimeout(() => activateTakeout(index), delay);
    State.takeoutTimers.push(timer);
  }

  function activateTakeout(index) {
    const order = TakeoutOrders[index];
    if (!order || State.closing || index >= takeoutCapacityForLevel() || !State.running || order.active) return;
    order.serial = ++State.takeoutSerial;
    order.active = true;
    order.packed = false;
    order.missed = false;
    order.items = createTakeoutItems();
    order.maxPatience = effectiveTakeoutPatienceMs();
    order.patience = order.maxPatience;
    renderTakeoutOrder(order);
    Sound.sfx("guest");
    Sound.haptic(10);
    burstAt($(`[data-takeout="${index}"]`), "drop", 6);
    toast(`포장 주문 #${String(order.serial).padStart(2, "0")}이 들어왔어요!`);
  }

  function expireTakeout(order) {
    if (!order.active || order.packed) return;
    order.patience = 0;
    order.active = false;
    order.missed = true;
    State.takeoutMissed += 1;
    State.takeoutPenalty += Config.takeout.missedPenalty;
    renderTakeoutOrder(order);
    renderHud();
    Sound.sfx("wrong");
    Sound.haptic([18, 24, 34]);
    floatFeedback($(`[data-takeout="${order.index}"]`), `-${money(Config.takeout.missedPenalty)}`, "warning");
    toast(`포장 주문을 놓쳤어요. 정산에서 ${money(Config.takeout.missedPenalty)} 차감돼요.`);
    const timer = setTimeout(() => resetTakeoutOrder(order, true), 760);
    State.takeoutTimers.push(timer);
  }

  function rejectTakeoutItem(order) {
    if (!order?.active) return toast("아직 포장 주문이 없어요.");
    order.patience = Math.max(0, order.patience - Config.guests.wrongPenaltyMs);
    renderTakeoutOrder(order);
    const element = $(`[data-takeout="${order.index}"]`);
    element.classList.remove("wrong-order");
    void element.offsetWidth;
    element.classList.add("wrong-order");
    setTimeout(() => element.classList.remove("wrong-order"), 430);
    Sound.sfx("wrong");
    if (order.patience <= 0) expireTakeout(order);
    else toast("포장 주문과 다른 메뉴예요.");
  }

  function completeTakeout(order) {
    const basePrice = order.items.reduce((sum, item) => sum + menuPriceWithUpgrade(item.id), 0);
    const bonus = Config.takeout.bonusByLevel[effectiveStallLevel()] || 0;
    const price = Math.round(basePrice * (1 + bonus));
    order.packed = true;
    order.active = false;
    State.sales += price;
    State.served += 1;
    State.takeoutServed += 1;
    renderTakeoutOrder(order);
    renderHud();
    Sound.sfx("serve");
    Sound.haptic([12, 18, 12]);
    burstAt($(`[data-takeout="${order.index}"]`), "serve", 9);
    floatFeedback($(`[data-takeout="${order.index}"]`), `+${money(price)}`, "sale");
    say("따뜻하게 포장했어요!");
    toast(`포장 완료 +${money(price)} · 포장 보너스 ${Math.round(bonus * 100)}%`);
    const timer = setTimeout(() => resetTakeoutOrder(order, true), 820);
    State.takeoutTimers.push(timer);
  }

  function deliverTakeoutItem(orderIndex, itemId, appliance = null, passIndex = null) {
    const order = TakeoutOrders[orderIndex];
    if (!order?.active) {
      toast("아직 포장 주문이 없어요.");
      return false;
    }
    const orderItem = order.items.find(item => item.id === itemId && !item.fulfilled);
    if (!orderItem) {
      rejectTakeoutItem(order);
      return false;
    }
    if (!appliance && passIndex == null && MenuCatalog[itemId]?.kind === "drink" && !consumeIngredient(itemId)) {
      return toast(`${MenuCatalog[itemId].label} 재고가 없어요.`);
    }
    orderItem.fulfilled = true;
    if (appliance) takeApplianceServing(appliance);
    if (passIndex != null) clearPassSlot(passIndex, false);
    teleportToTakeout(orderIndex);
    renderTakeoutOrder(order);
    Sound.sfx("drop");
    Sound.haptic(12);
    if (order.items.every(item => item.fulfilled)) completeTakeout(order);
    else toast(`${MenuCatalog[itemId].label} 포장 · ${order.items.filter(item => !item.fulfilled).length}개 남았어요.`);
    return true;
  }

  function scheduleGuest(index, delay) {
    if (State.closing || index >= guestCapacityForLevel()) return;
    const timer = setTimeout(() => activateGuest(index), delay);
    State.guestTimers.push(timer);
  }

  function activateGuest(index) {
    const guest = Guests[index];
    if (!guest || State.closing || index >= guestCapacityForLevel() || !State.running || guest.active) return;
    const customer = chooseCustomer();
    guest.customerId = customer.id;
    guest.active = true;
    guest.serving = false;
    guest.satisfaction = "waiting";
    guest.maxPatience = effectivePatienceMs();
    guest.patience = guest.maxPatience;
    assignOrder(guest);
    recordCustomerVisit(guest.customerId);
    State.guests += 1;
    renderHud();
    renderGuest(guest);
    const slot = $(`[data-guest="${index}"]`);
    slot.classList.add("arriving");
    setTimeout(() => slot.classList.remove("arriving"), 430);
    Sound.sfx("guest");
    burstAt(slot, "drop", 6);
    toast(`${index + 1}번 자리에 ${customer.name}님이 왔어요!`);
    const profile = CustomerStoryCatalog[guest.customerId];
    const visitRecord = regularRecord(guest.customerId);
    const arrivalLine = visitRecord.visits === 1 ? profile.first : randomChoice(profile.arrivals);
    queueGuestDialogue(guest.customerId, arrivalLine, { meta: relationshipInfo(visitRecord).label });
    Tutorial.handle("guest", { guest });
  }

  function dismissGuest(index) {
    const guest = Guests[index];
    guest.active = false;
    guest.serving = false;
    guest.order = null;
    guest.patience = 0;
    guest.satisfaction = "waiting";
    guest.customerId = null;
    renderGuest(guest);
    if (State.running && !State.closing && index < guestCapacityForLevel()) scheduleGuest(index, arrivalDelay(2800 + index * 450));
    checkClosingComplete();
  }

  function expireGuest(guest) {
    if (!guest.active || guest.serving) return;
    guest.patience = 0;
    guest.serving = true;
    guest.satisfaction = "angry";
    State.missed += 1;
    recordCustomerMissed(guest.customerId);
    queueGuestDialogue(guest.customerId, CustomerStoryCatalog[guest.customerId].missed, { kind: "missed", meta: "다음에 다시 만나요" });
    renderGuest(guest);
    Sound.sfx("wrong");
    Sound.haptic([20, 25, 35]);
    floatFeedback($(`[data-guest="${guest.index}"]`), "기다리다 떠나요", "warning");
    toast(`${guest.index + 1}번 손님이 기다리다 떠나요.`);
    const leaveTimer = setTimeout(() => dismissGuest(guest.index), 720);
    State.guestTimers.push(leaveTimer);
  }

  function tickGuests() {
    const now = performance.now();
    const elapsed = Math.min(250, Math.max(0, now - State.guestClock));
    State.guestClock = now;
    if (!State.running || State.paused || State.tutorialMode) return;
    if (!Config.guests.waitsForever) {
      Guests.forEach(guest => {
        if (!guest.active || guest.serving) return;
        guest.patience = Math.max(0, guest.patience - elapsed);
        if (guest.patience <= 0) expireGuest(guest);
        else renderPatience(guest);
      });
    }
    TakeoutOrders.forEach(order => {
      if (!order.active || order.packed) return;
      order.patience = Math.max(0, order.patience - elapsed);
      if (order.patience <= 0) expireTakeout(order);
      else renderTakeoutOrder(order);
    });
  }

  function resetGuests() {
    clearGuestTimers();
    Guests.forEach(guest => {
      guest.active = false;
      guest.serving = false;
      guest.order = null;
      guest.patience = 0;
      guest.satisfaction = "waiting";
      guest.customerId = null;
      renderGuest(guest);
    });
  }

  function stageBoxFor(element) {
    const stage = $("#stage");
    let current = element;
    let left = 0;
    let top = 0;
    while (current && current !== stage) {
      left += current.offsetLeft;
      top += current.offsetTop;
      const transform = getComputedStyle(current).transform;
      if (transform && transform !== "none") {
        const matrix = new DOMMatrixReadOnly(transform);
        left += matrix.e;
        top += matrix.f;
      }
      current = current.offsetParent;
    }
    if (current === stage) {
      return { left, top, width: element.offsetWidth, height: element.offsetHeight };
    }
    const stageRect = stage.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const scale = stageRect.width / Config.stage.currentWidth || 1;
    return {
      left: (targetRect.left - stageRect.left) / scale,
      top: (targetRect.top - stageRect.top) / scale,
      width: targetRect.width / scale,
      height: targetRect.height / scale
    };
  }

  function laneLeftFor(targetElement, spriteWidth) {
    const target = stageBoxFor(targetElement);
    const lane = stageBoxFor($(".characters"));
    return target.left + target.width / 2 - lane.left - spriteWidth / 2;
  }

  function animateBoreumi(mode, pose, targetElement) {
    const boreumi = $("#boreumi");
    clearTimeout(State.boreumiTimer);
    boreumi.dataset.mode = mode;
    boreumi.dataset.pose = pose;
    const laneWidth = $(".characters").clientWidth;
    const fallbackWidth = mode === "cooking" ? Config.boreumi.cookingWidth : mode === "serving" ? Config.boreumi.servingWidth : Config.boreumi.idleWidth;
    const spriteWidth = boreumi.offsetWidth || fallbackWidth;
    const left = laneLeftFor(targetElement, spriteWidth);
    boreumi.style.left = Math.max(12, Math.min(laneWidth - spriteWidth - 12, left)) + "px";
    boreumi.classList.remove("teleport", "action");
    void boreumi.offsetWidth;
    boreumi.classList.add("teleport");
    setTimeout(() => {
      boreumi.classList.remove("teleport");
      boreumi.classList.add("action");
    }, 110);
  }

  function setBoreumiIdlePosition() {
    const boreumi = $("#boreumi");
    const laneWidth = $(".characters").clientWidth || Config.stage.currentWidth;
    const spriteWidth = boreumi.offsetWidth || Config.boreumi.idleWidth;
    const levelOffset = guestCapacityForLevel() >= 4 ? 0 : Config.boreumi.idleOffset;
    boreumi.style.left = `${(laneWidth - spriteWidth) / 2 + levelOffset}px`;
  }

  function setBoreumiIdle(delay = 0) {
    clearTimeout(State.boreumiTimer);
    const applyIdlePose = () => {
      const boreumi = $("#boreumi");
      boreumi.dataset.mode = "idle";
      boreumi.dataset.pose = "idle";
      setBoreumiIdlePosition();
      boreumi.classList.remove("teleport", "action");
    };
    if (delay <= 0) applyIdlePose();
    else State.boreumiTimer = setTimeout(applyIdlePose, delay);
  }

  function teleport(appliance, text) {
    const targetElement = $(`[data-id="${appliance.id}"]`);
    if (!targetElement || targetElement.hidden) return setBoreumiIdle();
    const pose = appliance.type === "pot" ? (IngredientRules[appliance.item]?.mode === "addon" ? "egg" : "noodle") : appliance.type;
    animateBoreumi("cooking", pose, targetElement);
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 920);
    burstAt($(`[data-id="${appliance.id}"]`), "drop", 5);
    say(text);
  }

  function teleportToGuest(guestIndex) {
    const targetElement = $(`[data-guest="${guestIndex}"]`);
    if (!targetElement || targetElement.hidden) return setBoreumiIdle();
    animateBoreumi("serving", "serve", targetElement);
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 820);
  }

  function teleportToTakeout(orderIndex) {
    const targetElement = $(`[data-takeout="${orderIndex}"]`);
    if (!targetElement || targetElement.hidden) return setBoreumiIdle();
    animateBoreumi("serving", "serve", targetElement);
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 820);
  }

  function teleportToPass() {
    const targetElement = $("#completionPass");
    if (!targetElement || targetElement.hidden) return setBoreumiIdle();
    animateBoreumi("cooking", "grill", targetElement);
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 720);
  }

  function accepts(appliance, item) {
    return IngredientRules[item]?.appliance === appliance.type;
  }

  function startCooking(appliance, item) {
    appliance.state = "cooking";
    appliance.item = item;
    appliance.ingredients = [item];
    appliance.recipeId = resolveRecipeId(appliance);
    appliance.servingsShown = appliance.type === "oden" ? 3 : 0;
    const recipe = recipeFor(appliance);
    appliance.cookRemaining = effectiveCookMs(recipe);
    appliance.burnRemaining = effectiveBurnMs(recipe);
    renderAppliance(appliance);
    Sound.sfx("cook");
    Sound.haptic(8);
    teleport(appliance, appliance.type === "pot" ? "조리 시작!" : appliance.type === "grill" ? "노릇하게 구울게!" : "따끈하게 데울게!");
    Tutorial.handle("cooking", { appliance });
  }

  function completeCooking(appliance) {
    if (appliance.state !== "cooking") return;
    appliance.state = "ready";
    appliance.cookRemaining = 0;
    appliance.burnRemaining = effectiveBurnMs(recipeFor(appliance));
    renderAppliance(appliance);
    Sound.sfx("complete");
    Sound.haptic([12, 24, 12]);
    burstAt($(`[data-id="${appliance.id}"]`), "complete", 10);
    floatFeedback($(`[data-id="${appliance.id}"]`), "완성!", "sale");
    toast(`${recipeFor(appliance).label} 완성!`);
    Tutorial.handle("ready", { appliance });
  }

  function burnFood(appliance) {
    if (appliance.state !== "ready") return;
    if (recipeFor(appliance)?.burns === false) return;
    appliance.state = "burnt";
    appliance.burnRemaining = 0;
    renderAppliance(appliance);
    Sound.sfx("burn");
    Sound.haptic([35, 28, 55]);
    burstAt($(`[data-id="${appliance.id}"]`), "burn", 9);
    floatFeedback($(`[data-id="${appliance.id}"]`), "타버렸어요!", "warning");
    toast(`${recipeFor(appliance).label}이(가) 타버렸어요!`);
  }

  function tickCooking() {
    const now = performance.now();
    const elapsed = Math.min(250, Math.max(0, now - State.cookingClock));
    State.cookingClock = now;
    if (!State.running || State.paused) return;
    Appliances.forEach(appliance => {
      if (appliance.state === "cooking") {
        appliance.cookRemaining -= elapsed;
        if (appliance.cookRemaining <= 0) completeCooking(appliance);
        else renderProgress(appliance);
      } else if (appliance.state === "ready" && !State.tutorialMode && recipeFor(appliance)?.burns !== false) {
        appliance.burnRemaining -= elapsed;
        if (appliance.burnRemaining <= 0) burnFood(appliance);
        else renderProgress(appliance);
      }
    });
  }

  function dropItem(appliance, item) {
    if (!State.running) return toast("먼저 영업을 시작해 주세요.");
    const rule = IngredientRules[item];
    if (!rule || !accepts(appliance, item)) return toast("이 재료는 다른 조리기구에 넣어주세요.");
    if (!isIngredientUnlocked(item)) return toast(`${IngredientCatalog[item].label}은(는) 포차 LV.${IngredientCatalog[item].unlockLevel}에서 열려요.`);
    if (!State.tutorialMode && ingredientStock(item) <= 0) return toast(`${IngredientCatalog[item].label} 재고가 없어요. 위쪽 재료 상점에서 보충해 주세요.`);
    if (appliance.state === "ready") return toast("완성된 음식을 먼저 서빙하거나 버려주세요.");
    if (appliance.state === "burnt") return toast("탄 음식을 먼저 버려주세요.");

    if (rule.mode === "addon") {
      if (appliance.state === "empty" || !appliance.ingredients.includes(rule.requires)) return toast("물이 담긴 냄비에 면을 먼저 넣어주세요.");
      if (appliance.state !== "cooking") return toast("조리 중인 냄비에만 토핑을 넣을 수 있어요.");
      const addons = appliance.ingredients.filter(ingredient => IngredientRules[ingredient]?.mode === "addon");
      if (addons.includes(item)) return toast("이미 넣은 토핑이에요.");
      if (addons.length >= 2) return toast("라면 토핑은 두 종류까지 넣을 수 있어요.");
      if (!resolveRecipeId({ ...appliance, ingredients: [...appliance.ingredients, item] })) return toast("레시피 수첩에 없는 조합이에요.");
      if (!consumeIngredient(item)) return toast(`${IngredientCatalog[item].label} 재고가 부족해요.`);
      appliance.ingredients.push(item);
      appliance.item = item;
      appliance.recipeId = resolveRecipeId(appliance);
      renderAppliance(appliance);
      Sound.sfx("drop");
      Sound.haptic(8);
      teleport(appliance, `${IngredientCatalog[item].label} 추가!`);
      return;
    }

    if (appliance.state !== "empty") return toast("다른 빈 조리기구를 사용해 주세요.");
    if (!consumeIngredient(item)) return toast(`${IngredientCatalog[item].label} 재고가 부족해요.`);
    startCooking(appliance, item);
  }

  function resetAppliance(appliance) {
    appliance.state = "empty";
    appliance.item = null;
    appliance.ingredients = [];
    appliance.recipeId = null;
    appliance.cookRemaining = 0;
    appliance.burnRemaining = 0;
    appliance.servingsShown = 0;
    renderAppliance(appliance);
  }

  function takeApplianceServing(appliance) {
    if (appliance?.type !== "oden") {
      resetAppliance(appliance);
      return;
    }
    appliance.servingsShown = Math.max(1, (appliance.servingsShown || 3) - 1);
    appliance.state = "ready";
    appliance.cookRemaining = 0;
    appliance.burnRemaining = 0;
    renderAppliance(appliance);
  }

  function discardAppliance(appliance) {
    if (!appliance || !["ready", "burnt"].includes(appliance.state)) return toast("버릴 음식이 없어요.");
    const wasBurnt = appliance.state === "burnt";
    const label = recipeFor(appliance)?.label || "음식";
    State.waste += 1;
    resetAppliance(appliance);
    Sound.sfx("discard");
    Sound.haptic(10);
    burstAt($(`[data-id="${appliance.id}"]`), "drop", 5);
    say("깔끔하게 치울게!");
    toast(wasBurnt ? `${label}을(를) 버렸어요.` : `${label}을(를) 폐기했어요.`);
  }

  function storeFoodInPass(appliance, passIndex) {
    const slot = CompletionPassSlots[passIndex];
    if (passIndex >= completionPassCapacityForLevel()) return toast("아직 열리지 않은 완성대 칸이에요.");
    if (!slot || slot.recipeId) return toast("다른 빈 완성대 칸을 사용해 주세요.");
    if (appliance?.state !== "ready") return toast("완성된 음식만 완성대에 둘 수 있어요.");
    slot.recipeId = appliance.recipeId;
    takeApplianceServing(appliance);
    renderPassSlot(passIndex);
    teleportToPass();
    Sound.sfx("drop");
    Sound.haptic(10);
    burstAt($(`[data-pass-slot="${passIndex}"]`), "drop", 6);
    toast(`${MenuCatalog[slot.recipeId].label}을(를) 완성대에 보관했어요.`);
  }

  function discardPassSlot(passIndex) {
    const slot = CompletionPassSlots[passIndex];
    if (!slot?.recipeId) return toast("완성대가 비어 있어요.");
    const label = MenuCatalog[slot.recipeId].label;
    State.waste += 1;
    clearPassSlot(passIndex, false);
    Sound.sfx("discard");
    Sound.haptic(10);
    toast(`${label}을(를) 폐기했어요.`);
  }

  function rejectOrderItem(guest) {
    renderPatience(guest);
    const slot = $(`[data-guest="${guest.index}"]`);
    slot.classList.remove("wrong-order");
    void slot.offsetWidth;
    slot.classList.add("wrong-order");
    setTimeout(() => slot.classList.remove("wrong-order"), 430);
    Sound.sfx("wrong");
    Sound.haptic(22);
    toast(State.tutorialMode ? "연습 주문은 기본 라면과 소주예요." : "주문과 다른 메뉴예요. 다시 확인해 주세요.");
  }

  function satisfactionFor(guest) {
    if (Config.guests.waitsForever) return "happy";
    const ratio = guest.maxPatience ? guest.patience / guest.maxPatience : 0;
    if (ratio >= .65) return "happy";
    if (ratio >= .3) return "okay";
    return "tired";
  }

  function completeOrder(guest) {
    if (State.tutorialMode) {
      guest.serving = true;
      guest.satisfaction = "happy";
      renderGuest(guest);
      say("연습 주문 완성!");
      const practiceSlot = $(`[data-guest="${guest.index}"]`);
      burstAt(practiceSlot, "serve", 10);
      floatFeedback(practiceSlot, "연습 완료", "sale");
      toast("잘했어요! 실제 영업 기록에는 영향을 주지 않아요.");
      return;
    }
    const price = guest.order.items.reduce((sum, item) => sum + menuPriceWithUpgrade(item.id), 0);
    guest.serving = true;
    guest.satisfaction = satisfactionFor(guest);
    State.sales += price;
    State.served += 1;
    State.ratings[guest.satisfaction] += 1;
    const storyMoment = recordCustomerStory(guest.customerId, guest);
    renderGuest(guest);
    renderHud();
    say("맛있게 드세요!");
    const slot = $(`[data-guest="${guest.index}"]`);
    slot.animate([{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }], { duration: 350 });
    floatFeedback(slot, `+${money(price)}`, "sale");
    const leaveTimer = setTimeout(() => dismissGuest(guest.index), 720);
    State.guestTimers.push(leaveTimer);
    const customer = CustomerById[guest.customerId];
    const profile = CustomerStoryCatalog[guest.customerId];
    queueGuestDialogue(guest.customerId, randomChoice(profile.reactions), storyMoment
      ? { kind: "episode", meta: `새 이야기 · ${relationshipInfo(regularRecord(guest.customerId)).label}`, title: `${customer.name} · ${storyMoment.title}` }
      : { kind: "served", meta: relationshipInfo(regularRecord(guest.customerId)).label });
    toast(storyMoment ? `새 이야기: ${storyMoment.title}` : `주문 완료 +${money(price)}`);
  }

  function deliverOrderItem(guestIndex, itemId, appliance = null) {
    const guest = Guests[guestIndex];
    if (!guest?.active) {
      toast("빈자리에는 서빙할 수 없어요.");
      return false;
    }
    if (guest.serving) {
      toast("지금 주문을 마무리하고 있어요.");
      return false;
    }
    const orderItem = guest.order?.items.find(item => item.id === itemId && !item.fulfilled);
    if (!orderItem) {
      rejectOrderItem(guest);
      return false;
    }

    if (!appliance && MenuCatalog[itemId]?.kind === "drink" && !consumeIngredient(itemId)) {
      return toast(`${MenuCatalog[itemId].label} 재고가 없어요.`);
    }
    orderItem.fulfilled = true;
    if (appliance) takeApplianceServing(appliance);
    teleportToGuest(guestIndex);
    renderGuest(guest);
    Sound.sfx("serve");
    Sound.haptic(16);
    burstAt($(`[data-guest="${guestIndex}"]`), "serve", 8);
    Tutorial.handle("served", { guest, itemId, kind: MenuCatalog[itemId]?.kind });
    const remaining = pendingItems(guest).length;
    if (remaining) {
      say(`${MenuCatalog[itemId].label} 먼저 드릴게요!`);
      toast(`${MenuCatalog[itemId].label} 전달 · ${remaining}개 남았어요.`);
    } else {
      completeOrder(guest);
    }
    return true;
  }

  function serve(appliance, guestIndex) {
    if (appliance.state !== "ready") return toast("완성된 음식만 서빙할 수 있어요.");
    deliverOrderItem(guestIndex, appliance.recipeId, appliance);
  }

  function serveDrink(drinkId, guestIndex) {
    if (MenuCatalog[drinkId]?.kind !== "drink") return toast("서빙할 수 없는 음료예요.");
    deliverOrderItem(guestIndex, drinkId);
  }

  function servePassFood(passIndex, guestIndex) {
    const slot = CompletionPassSlots[passIndex];
    if (!slot?.recipeId) return toast("완성대가 비어 있어요.");
    if (deliverOrderItem(guestIndex, slot.recipeId)) clearPassSlot(passIndex, false);
  }

  function satisfactionLabel() {
    const ratedOrders = State.ratings.happy + State.ratings.okay + State.ratings.tired;
    if (!ratedOrders) return "기록 없음";
    const score = (State.ratings.happy * 3 + State.ratings.okay * 2 + State.ratings.tired) / ratedOrders;
    if (score >= 2.5) return "최고예요";
    if (score >= 1.7) return "좋아요";
    return "조금 지쳤어요";
  }

  function stationEffectText(type, level = stationLevel(type)) {
    const upgrade = StationUpgradeCatalog[type];
    const speed = Math.round((1 - upgrade.speed[level - 1]) * 100);
    const price = Math.round(upgrade.priceBonus[level - 1] * 100);
    const effects = [speed ? `조리 ${speed}% 단축` : "기본 조리 속도"];
    effects.push("완성 후 계속 보온");
    if (price) effects.push(`음식값 +${price}%`);
    return effects.join(" · ");
  }

  function nextStallLevel() {
    return Math.min(StallUpgradeCatalog.maxLevel, Progress.stallLevel + 1);
  }

  function stationRequirementMet(level = nextStallLevel()) {
    return Object.values(Progress.stationLevels).every(station => station >= level);
  }

  function nextProgressionText() {
    const current = progressionMilestone(Progress.day, Progress.stallLevel);
    const next = ProgressionMilestones[ProgressionMilestones.indexOf(current) + 1];
    return next ? `${next.label}: 좌석 ${next.seats}석 · 손님 ${next.customers}명` : "최대 좌석 10석 · 손님 18명 해금 완료";
  }

  function menuIngredientText(id) {
    const recipe = RecipeCatalog[id];
    if (recipe) return recipe.ingredients.map(ingredient => IngredientCatalog[ingredient]?.label || ingredient).join(" + ");
    return MenuCatalog[id]?.kind === "drink" ? "바로 서빙" : "완성 메뉴";
  }

  function renderRecipeBook() {
    const level = effectiveStallLevel();
    const foodMenus = Object.values(MenuCatalog).filter(item => item.kind === "food");
    const known = foodMenus.filter(item => (MenuUnlockLevel[item.id] || 1) <= level).length;
    $("#recipeKnownCount").textContent = `${known}/${foodMenus.length}`;
    const groups = [
      { title: "라면", items: foodMenus.filter(item => item.id.startsWith("ramen_")) },
      { title: "안주", items: foodMenus.filter(item => !item.id.startsWith("ramen_")) },
      { title: "주류", items: Object.values(MenuCatalog).filter(item => item.kind === "drink") }
    ];
    $("#recipeSections").innerHTML = groups.map(group => `<section class="recipe-group"><h3>${group.title}</h3><div class="recipe-grid">${group.items.map(item => {
      const unlockLevel = MenuUnlockLevel[item.id] || 1;
      const unlocked = unlockLevel <= level;
      const cost = recipeCost(item.id);
      const margin = Math.max(0, item.price - cost);
      return `<article class="recipe-card${unlocked ? "" : " locked"}" data-recipe-id="${item.id}"><img src="${item.art}" alt=""><div class="recipe-copy"><small>${group.title} · ${money(item.price)}</small><strong>${unlocked ? item.label : "잠긴 메뉴"}</strong><p>${unlocked ? menuIngredientText(item.id) : `포차 LV.${unlockLevel}에서 해금`}</p><p class="recipe-economy">${unlocked ? `재료 원가 ${money(cost)} · 기본 이익 ${money(margin)}` : "새 재료와 함께 열려요"}</p>${unlocked ? "" : `<span class="recipe-lock">LV.${unlockLevel}</span>`}</div></article>`;
    }).join("")}</div></section>`).join("");
  }

  function openRecipeBook() {
    if (State.tutorialMode) return toast("연습을 마친 뒤 메뉴 수첩을 볼 수 있어요.");
    if (!$("#journalOverlay").classList.contains("hidden")) closeJournal(false);
    if (!$("#helpOverlay").classList.contains("hidden")) closeHelp(false);
    State.recipePausedGame = State.running && !State.paused;
    if (State.recipePausedGame) {
      State.paused = true;
      Sound.stopBgm();
      $("#stage").classList.add("paused-fx");
    }
    renderRecipeBook();
    $("#recipeOverlay").classList.remove("hidden");
    Sound.sfx("drop");
  }

  function closeRecipeBook(resumeGame = true) {
    $("#recipeOverlay").classList.add("hidden");
    if (resumeGame && State.recipePausedGame) {
      State.paused = false;
      State.recipePausedGame = false;
      $("#stage").classList.remove("paused-fx");
      Sound.startBgm();
    }
  }

  const MenuUnlockQueue = [];
  function showNextMenuUnlock() {
    const id = MenuUnlockQueue.shift();
    const notice = $("#menuUnlockNotice");
    if (!id || !MenuCatalog[id]) return notice.classList.add("hidden");
    const menu = MenuCatalog[id];
    $("#menuUnlockArt").src = menu.art;
    $("#menuUnlockArt").alt = menu.label;
    $("#menuUnlockName").textContent = menu.label;
    $("#menuUnlockRecipe").textContent = menuIngredientText(id);
    notice.classList.remove("hidden");
    Sound.sfx("upgrade");
  }

  function announceNewMenus(previousLevel, currentLevel) {
    Progress.menuUnlocksSeen ||= [];
    const unlocked = Object.keys(MenuUnlockLevel).filter(id => MenuUnlockLevel[id] > previousLevel && MenuUnlockLevel[id] <= currentLevel && !Progress.menuUnlocksSeen.includes(id));
    if (!unlocked.length) return;
    Progress.menuUnlocksSeen.push(...unlocked);
    saveProgress();
    MenuUnlockQueue.push(...unlocked);
    if ($("#menuUnlockNotice").classList.contains("hidden")) showNextMenuUnlock();
  }

  function renderSupplyShop() {
    const list = $("#supplyShopList");
    if (!list) return;
    $("#supplyShopGold").textContent = money(Progress.gold);
    list.innerHTML = Object.values(IngredientCatalog).map(item => {
      const unlocked = item.unlockLevel <= Progress.stallLevel;
      const stock = ingredientStock(item.id);
      const missing = Math.max(0, item.targetStock - stock);
      const five = Math.min(5, missing);
      return `<article class="supply-item-card${unlocked ? "" : " locked"}" data-supply-id="${item.id}"><img src="${item.art}" alt=""><div><strong>${unlocked ? item.label : `LV.${item.unlockLevel} 잠김`}</strong><p>${unlocked ? `재고 ${stock}/${item.targetStock} · 1개 ${money(item.unitCost)}` : `포차 LV.${item.unlockLevel} 해금`}</p><div class="supply-buy-actions"><button type="button" data-buy="1" ${!unlocked || missing < 1 || Progress.gold < item.unitCost ? "disabled" : ""}>+1</button><button type="button" data-buy="5" ${!unlocked || five < 1 || Progress.gold < item.unitCost * five ? "disabled" : ""}>+5</button><button type="button" data-buy="all" ${!unlocked || missing < 1 || Progress.gold < item.unitCost * missing ? "disabled" : ""}>가득</button></div></div></article>`;
    }).join("");
    list.querySelectorAll("[data-buy]").forEach(button => button.addEventListener("click", () => {
      const id = button.closest("[data-supply-id]").dataset.supplyId;
      buyIngredient(id, button.dataset.buy === "all" ? "all" : Number(button.dataset.buy));
    }));
    const all = supplyPlan();
    const allButton = $("#supplyShopRestockAll");
    allButton.disabled = !all.quantity || Progress.gold < all.total;
    allButton.textContent = !all.quantity ? "열린 재료 재고 가득" : `열린 재료 전체 보충 · ${money(all.total)}`;
  }

  function openSupplyShop() {
    if (State.tutorialMode) return toast("연습을 마친 뒤 재료 상점을 이용할 수 있어요.");
    if (!$("#journalOverlay").classList.contains("hidden")) closeJournal(false);
    if (!$("#helpOverlay").classList.contains("hidden")) closeHelp(false);
    if (!$("#recipeOverlay").classList.contains("hidden")) closeRecipeBook(false);
    State.supplyPausedGame = State.running && !State.paused;
    if (State.supplyPausedGame) {
      State.paused = true;
      Sound.stopBgm();
      $("#stage").classList.add("paused-fx");
    }
    renderSupplyShop();
    $("#supplyShopOverlay").classList.remove("hidden");
    Sound.sfx("drop");
  }

  function closeSupplyShop(resumeGame = true) {
    $("#supplyShopOverlay").classList.add("hidden");
    if (resumeGame && State.supplyPausedGame) {
      State.paused = false;
      State.supplyPausedGame = false;
      $("#stage").classList.remove("paused-fx");
      Sound.startBgm();
    }
  }

  function renderUpgradeShop() {
    $("#shopGold").textContent = money(Progress.gold);
    const supplies = supplyPlan();
    $("#supplySummary").textContent = supplies.quantity
      ? `${supplies.quantity}개 부족 · ${money(supplies.total)}`
      : "모든 재료가 가득해요";
    const restockButton = $("#restockButton");
    restockButton.disabled = supplies.quantity === 0 || Progress.gold < supplies.total;
    restockButton.textContent = supplies.quantity === 0 ? "재고 가득" : Progress.gold < supplies.total ? "잔액 부족" : `가득 보충 · ${money(supplies.total)}`;
    renderSupplyShop();
    const list = $("#upgradeList");
    const stationCards = Object.values(StationUpgradeCatalog).map(upgrade => {
      const level = stationLevel(upgrade.id);
      const maxLevel = 5;
      const cost = upgrade.costs[level - 1];
      const maxed = level >= 5;
      const disabled = maxed || Progress.gold < cost;
      const nextText = maxed ? "모든 강화 효과 적용 완료" : `다음: ${stationEffectText(upgrade.id, level + 1)}`;
      return `<article class="upgrade-card" data-upgrade-card="${upgrade.id}"><header><h4>${upgrade.title}</h4><span class="upgrade-level">LV.${level}/${maxLevel}</span></header><small>${upgrade.subtitle}</small><p><b>${stationEffectText(upgrade.id, level)}</b><br>${nextText}</p><button type="button" data-station-upgrade="${upgrade.id}" ${disabled ? "disabled" : ""}>${maxed ? "최대 강화" : `강화 · ${money(cost)}`}</button></article>`;
    }).join("");
    const stallLevel = Progress.stallLevel;
    const stallMaxed = stallLevel >= StallUpgradeCatalog.maxLevel;
    const targetLevel = nextStallLevel();
    const stallCost = StallUpgradeCatalog.costs[stallLevel - 1];
    const requirementMet = !stallMaxed && stationRequirementMet(targetLevel);
    const stallDisabled = stallMaxed || !requirementMet || Progress.gold < stallCost;
    const requirement = stallMaxed
      ? "모든 포차 확장 완료"
      : `조건: 냄비·그릴·오뎅바 모두 LV.${targetLevel}`;
    const benefit = stallMaxed ? StallUpgradeCatalog.benefits[5] : StallUpgradeCatalog.benefits[targetLevel];
    const stallCard = `<article class="upgrade-card stall-upgrade-card" data-upgrade-card="stall"><header><h4>포장마차 확장</h4><span class="upgrade-level">LV.${stallLevel}/5</span></header><small>${requirement}</small><p><b>${benefit}</b><br>${nextProgressionText()}</p><button type="button" data-stall-upgrade ${stallDisabled ? "disabled" : ""}>${stallMaxed ? "최대 확장" : !requirementMet ? "조리도구 레벨 부족" : `확장 · ${money(stallCost)}`}</button></article>`;
    list.innerHTML = stationCards + stallCard;
    list.querySelectorAll("[data-station-upgrade]").forEach(button => button.addEventListener("click", () => buyStationUpgrade(button.dataset.stationUpgrade)));
    list.querySelector("[data-stall-upgrade]")?.addEventListener("click", buyStallUpgrade);
  }

  function restockIngredients() {
    const supplies = supplyPlan();
    if (!supplies.quantity) return toast("모든 재료가 가득해요.");
    if (Progress.gold < supplies.total) return toast(`재료 보충에 ${money(supplies.total)}이 필요해요.`);
    Progress.gold -= supplies.total;
    supplies.items.forEach(item => {
      if (item.quantity) Progress.inventory[item.id] = item.targetStock;
    });
    Progress.stats.totalSupplyCost += supplies.total;
    saveProgress();
    InventoryCategories.forEach(category => renderDockCategory(category.id));
    renderHud();
    renderUpgradeShop();
    Sound.sfx("upgrade");
    Sound.haptic([10, 18, 10]);
    toast(`${supplies.quantity}개 재료를 ${money(supplies.total)}에 보충했어요.`);
  }

  function renderSettlement(settlement = State.lastSettlement) {
    if (!settlement) return;
    $("#settlementDay").textContent = String(settlement.completedDay);
    $("#settlementResult").textContent = settlement.levelUp ? `포차 LV.${settlement.newStallLevel} 확장!` : "오늘도 수고했어요";
    $("#settlementResult").classList.remove("failed");
    $("#settlementOverlay").classList.toggle("level-up", settlement.levelUp);
    $("#summaryGoal").textContent = money(settlement.cumulativeSales);
    $("#summarySales").textContent = money(settlement.sales);
    $("#summaryServed").textContent = `${settlement.served}건 · 포장 ${settlement.takeoutServed}건`;
    $("#summaryMissed").textContent = `${settlement.missed}명 · 포장 ${settlement.takeoutMissed}건`;
    $("#summaryWaste").textContent = `${settlement.waste}개`;
    $("#summaryRating").textContent = settlement.rating;
    $("#rewardSales").textContent = `+${money(settlement.sales)}`;
    $("#rewardService").textContent = `+${money(settlement.serviceBonus)}`;
    $("#rewardTakeoutPenalty").textContent = `-${money(settlement.takeoutPenalty)}`;
    $("#rewardTotal").textContent = `+${money(settlement.totalReward)}`;
    $("#summaryStallLevel").textContent = String(effectiveStallLevel());
    const targetLevel = nextStallLevel();
    const minimumStationLevel = Math.min(...Object.values(Progress.stationLevels));
    const progress = Progress.stallLevel >= 5 ? 100 : Math.min(100, minimumStationLevel / targetLevel * 100);
    $("#growthFill").style.width = `${progress}%`;
    $("#growthText").textContent = settlement.levelUp
      ? StallUpgradeCatalog.benefits[settlement.newStallLevel]
      : settlement.storyMoments > 0
        ? `새 이야기 ${settlement.storyMoments}개 · ${nextProgressionText()}`
        : Progress.stallLevel >= 5
          ? "최대 포차 확장 완료 · DAY는 계속 이어져요"
          : `다음 포차 LV.${targetLevel}: 조리도구 모두 LV.${targetLevel} + ${money(StallUpgradeCatalog.costs[Progress.stallLevel - 1])}`;
    $("#nextDayButton").textContent = settlement.levelUp ? "확장된 포차에서 영업 시작" : "다음 날 영업 시작";
    const storyRecap = $("#storyRecap");
    storyRecap.hidden = settlement.storyMoments <= 0;
    $("#storyRecapText").textContent = settlement.storyMoments
      ? State.dayStories.map(entry => CustomerById[entry.customerId].name + " · " + entry.title).join(" / ")
      : "";
    renderUpgradeShop();
    $("#settlementOverlay").classList.remove("hidden");
    if (settlement.levelUp) {
      setTimeout(() => burstAt($("#settlementResult"), "complete", 18), 80);
      Sound.sfx("upgrade");
      Sound.haptic([18, 28, 18, 35, 45]);
    }
  }

  function buyStationUpgrade(type) {
    if (State.running || !StationUpgradeCatalog[type]) return;
    const level = stationLevel(type);
    const cost = StationUpgradeCatalog[type].costs[level - 1];
    if (cost == null) return toast("이미 최대 단계예요.");
    if (Progress.gold < cost) return toast("보유 금액이 부족해요.");
    Progress.gold -= cost;
    Progress.stationLevels[type] += 1;
    saveProgress();
    renderHud();
    renderUpgradeShop();
    Sound.sfx("upgrade");
    Sound.haptic([10, 20, 10]);
    toast(`${StationUpgradeCatalog[type].title} LV.${Progress.stationLevels[type]} 강화!`);
  }

  function buyStallUpgrade() {
    if (State.running || Progress.stallLevel >= StallUpgradeCatalog.maxLevel) return;
    const targetLevel = Progress.stallLevel + 1;
    const cost = StallUpgradeCatalog.costs[Progress.stallLevel - 1];
    if (!stationRequirementMet(targetLevel)) return toast(`조리도구를 모두 LV.${targetLevel}로 강화해야 해요.`);
    if (Progress.gold < cost) return toast("포장마차 확장에 필요한 금액이 부족해요.");
    const previousLevel = Progress.stallLevel;
    Progress.gold -= cost;
    Progress.stallLevel = targetLevel;
    if (State.lastSettlement) {
      State.lastSettlement.levelUp = true;
      State.lastSettlement.newStallLevel = targetLevel;
    }
    saveProgress();
    applyStallLevel();
    renderHud();
    renderUpgradeShop();
    if (State.lastSettlement) renderSettlement(State.lastSettlement);
    announceNewMenus(previousLevel, targetLevel);
    Sound.sfx("upgrade");
    Sound.haptic([18, 28, 18, 35, 45]);
    burstAt($("#settlementResult"), "complete", 18);
    toast(`포장마차 LV.${targetLevel} 확장! ${StallUpgradeCatalog.benefits[targetLevel]}`);
  }

  function nextDay() {
    if (State.running) return;
    $("#settlementOverlay").classList.add("hidden");
    State.lastSettlement = null;
    $("#startButton").disabled = false;
    $("#startButton").setAttribute("aria-label", "영업 시작");
    $("#startButton strong").textContent = "영업 시작";
    start();
  }

  let resetArmedUntil = 0;
  let resetArmTimer = null;

  function disarmResetButton() {
    resetArmedUntil = 0;
    clearTimeout(resetArmTimer);
    const button = $("#resetProgressButton");
    button.classList.remove("armed");
    button.textContent = "진행 초기화";
  }

  function resetProgress() {
    const now = Date.now();
    if (now > resetArmedUntil) {
      resetArmedUntil = now + 3500;
      const button = $("#resetProgressButton");
      button.classList.add("armed");
      button.textContent = "한 번 더 눌러 초기화";
      resetArmTimer = setTimeout(disarmResetButton, 3500);
      return;
    }
    try {
      localStorage.removeItem(SaveKey);
      localStorage.removeItem(BackupKey);
    } catch { /* The in-memory reset still works. */ }
    Progress = freshProgress();
    saveProgress();
    Tutorial.completed = false;
    try { localStorage.removeItem(TutorialPreferenceKey); } catch { /* A fresh tutorial will still be available this session. */ }
    disarmResetButton();
    State.lastSettlement = null;
    State.sales = 0;
    State.guests = 0;
    State.time = Config.daySeconds;
    State.dayStories = [];
    clearGuestDialogues();
    State.takeoutServed = 0;
    State.takeoutMissed = 0;
    State.takeoutPenalty = 0;
    State.takeoutSerial = 0;
    $("#settlementOverlay").classList.add("hidden");
    $("#startButton").disabled = false;
    $("#startButton").setAttribute("aria-label", "영업 시작");
    $("#startButton strong").textContent = "영업 시작";
    resetGuests();
    resetTakeoutOrders();
    resetCompletionPass();
    Appliances.forEach(resetAppliance);
    applyStallLevel();
    renderHud();
    renderJournal();
    toast("진행 상황을 처음부터 시작해요.");
    setTimeout(() => Tutorial.start(false), 420);
  }

  function settleDay() {
    const completedDay = Progress.day;
    const previousStallLevel = Progress.stallLevel;
    const serviceBonus = State.ratings.happy * 400 + State.ratings.okay * 200;
    const totalReward = Math.max(0, State.sales + serviceBonus - State.takeoutPenalty);
    const cumulativeSalesTotal = Progress.stats.totalSales + State.sales;
    const settlement = {
      completedDay,
      cumulativeSales: cumulativeSalesTotal,
      sales: State.sales,
      served: State.served,
      missed: State.missed,
      takeoutServed: State.takeoutServed,
      takeoutMissed: State.takeoutMissed,
      takeoutPenalty: State.takeoutPenalty,
      waste: State.waste,
      rating: satisfactionLabel(),
      serviceBonus,
      totalReward,
      previousStallLevel,
      newStallLevel: previousStallLevel,
      levelUp: false,
      storyMoments: State.dayStories.length
    };
    Progress.gold += totalReward;
    Progress.day += 1;
    Progress.stats.completedDays += 1;
    Progress.stats.successfulDays += 1;
    Progress.stats.totalSales = cumulativeSalesTotal;
    Progress.stats.totalServed += State.served;
    Progress.stats.totalMissed += State.missed;
    Progress.stats.totalWaste += State.waste;
    Progress.stats.totalTakeoutServed += State.takeoutServed;
    Progress.stats.totalTakeoutMissed += State.takeoutMissed;
    settlement.newStallLevel = Progress.stallLevel;
    settlement.levelUp = false;
    saveProgress();
    applyStallLevel();
    return settlement;
  }

  function finishDay() {
    if (!State.running) return;
    State.running = false;
    State.paused = false;
    State.closing = false;
    clearInterval(State.dayTimer);
    clearGuestTimers();
    clearTakeoutTimers();
    Sound.stopBgm();
    Sound.sfx("finish");
    setBoreumiIdle();
    $("#stage").dataset.closing = "false";
    $(".hud").classList.remove("running");
    $("#startButton").style.removeProperty("display");
    $("#startButton").disabled = true;
    $("#startButton").setAttribute("aria-label", "영업 정산");
    $("#startButton strong").textContent = "정산중";
    State.lastSettlement = settleDay();
    clearGuestDialogues();
    renderHud();
    renderSettlement();
    toast(`영업 종료 · ${money(State.lastSettlement.totalReward)} 정산`);
  }

  function hasOpenOrders() {
    return Guests.some(guest => guest.active)
      || TakeoutOrders.some(order => order.active || order.packed);
  }

  function checkClosingComplete() {
    if (!State.running || !State.closing || hasOpenOrders()) return false;
    finishDay();
    return true;
  }

  function beginClosingTime() {
    if (!State.running || State.closing) return;
    State.closing = true;
    State.time = 0;
    $("#stage").dataset.closing = "true";
    $("#startButton").setAttribute("aria-label", "주문 마감 중");
    $("#startButton strong").textContent = "마감중";
    renderHud();
    if (!checkClosingComplete()) toast("주문 마감 · 남아 있는 손님을 모두 모실게요.");
  }

  function closeSettlement() {
    if (State.running) return;
    $("#settlementOverlay").classList.add("hidden");
    $("#startButton").disabled = false;
    $("#startButton").setAttribute("aria-label", "다음 날 영업 시작");
    $("#startButton strong").textContent = "영업 시작";
    Sound.sfx("drop");
  }

  function start() {
    if (State.running || !$("#settlementOverlay").classList.contains("hidden")) return;
    if (State.lastSettlement) State.lastSettlement = null;
    $("#startButton").classList.remove("first-day-ready");
    clearInterval(State.dayTimer);
    setBoreumiIdle();
    resetGuests();
    resetTakeoutOrders();
    resetCompletionPass();
    Appliances.forEach(resetAppliance);
    State.running = true;
    State.paused = false;
    State.supplyPausedGame = false;
    State.closing = false;
    $("#stage").dataset.closing = "false";
    State.time = Config.daySeconds;
    State.sales = 0;
    State.guests = 0;
    State.waste = 0;
    State.served = 0;
    State.missed = 0;
    State.takeoutServed = 0;
    State.takeoutMissed = 0;
    State.takeoutPenalty = 0;
    State.takeoutSerial = 0;
    State.ratings = { happy: 0, okay: 0, tired: 0 };
    State.dayStories = [];
    clearGuestDialogues();
    State.cookingClock = performance.now();
    State.guestClock = performance.now();
    Sound.ensure();
    Sound.startBgm();
    $(".hud").classList.add("running");
    $("#startButton").style.removeProperty("display");
    $("#startButton").disabled = true;
    $("#startButton").setAttribute("aria-label", "영업중");
    $("#startButton strong").textContent = "영업중";
    renderHud();
    Config.firstArrivals.slice(0, guestCapacityForLevel()).forEach((delay, index) => scheduleGuest(index, arrivalDelay(delay)));
    Config.takeout.firstArrivals.slice(0, takeoutCapacityForLevel()).forEach((delay, index) => scheduleTakeout(index, delay));
    State.dayTimer = setInterval(() => {
      if (State.paused) return;
      State.time -= 1;
      if (State.time <= 0) {
        State.time = 0;
        renderHud();
        beginClosingTime();
        return;
      }
      renderHud();
    }, 1000);
    say("오늘도 따뜻한 한 그릇!");
    toast("영업 시작!");
    Tutorial.handle("started");
  }

  function renderDevTools() {
    if (!IsDev) return;
    const state = $("#devState");
    if (state) state.textContent = `DAY ${Progress.day} · LV.${Progress.stallLevel} · ${money(Progress.gold)}`;
  }

  function devStopActiveDay() {
    State.running = false;
    State.paused = false;
    State.closing = false;
    $("#stage").dataset.closing = "false";
    clearInterval(State.dayTimer);
    clearGuestTimers();
    clearTakeoutTimers();
    Sound.stopBgm();
    clearGuestDialogues();
    resetGuests();
    resetTakeoutOrders();
    resetCompletionPass();
    Appliances.forEach(resetAppliance);
    State.sales = 0;
    State.guests = 0;
    State.time = Config.daySeconds;
    State.waste = 0;
    State.served = 0;
    State.missed = 0;
    State.takeoutServed = 0;
    State.takeoutMissed = 0;
    State.takeoutPenalty = 0;
    State.ratings = { happy: 0, okay: 0, tired: 0 };
    State.dayStories = [];
    $(".hud").classList.remove("running");
    $("#startButton").disabled = false;
    $("#startButton").setAttribute("aria-label", "영업 시작");
    $("#startButton strong").textContent = "영업 시작";
  }

  function devRefresh(message) {
    Progress.stationLevels = Object.fromEntries(Object.entries(Progress.stationLevels).map(([key, value]) => [key, Math.max(Progress.stallLevel, value)]));
    State.lastSettlement = null;
    $("#settlementOverlay").classList.add("hidden");
    saveProgress();
    applyStallLevel();
    renderHud();
    renderJournal();
    renderUpgradeShop();
    renderDevTools();
    if (message) toast(message);
  }

  function devAction(action) {
    if (!IsDev) return;
    if (action === "finish") {
      if (!State.running) return toast("현재 진행 중인 영업이 없어요.");
      State.time = 0;
      renderHud();
      if (hasOpenOrders()) beginClosingTime();
      else finishDay();
      renderDevTools();
      return;
    }
    devStopActiveDay();
    const previousLevel = Progress.stallLevel;
    if (action === "day-prev") Progress.day = Math.max(1, Progress.day - 1);
    if (action === "day-next") Progress.day = Math.min(Number.MAX_SAFE_INTEGER, Progress.day + 1);
    if (action === "day-10") Progress.day = Math.min(Number.MAX_SAFE_INTEGER, Progress.day + 10);
    if (action === "day-100") Progress.day = 100;
    if (action === "level-prev") Progress.stallLevel = Math.max(1, Progress.stallLevel - 1);
    if (action === "level-next") Progress.stallLevel = Math.min(5, Progress.stallLevel + 1);
    if (action === "level-max") {
      Progress.stallLevel = 5;
      Progress.day = Math.max(50, Progress.day);
      Progress.stationLevels = { pot: 5, grill: 5, oden: 5 };
    }
    if (action === "stations-max") Progress.stationLevels = { pot: 5, grill: 5, oden: 5 };
    if (action === "gold") Progress.gold = Math.min(Number.MAX_SAFE_INTEGER, Progress.gold + 1000000);
    if (action === "stock") Object.values(IngredientCatalog).forEach(item => { Progress.inventory[item.id] = item.targetStock; });
    if (action === "reset") Progress = freshProgress();
    const labels = {
      "day-prev": "이전 DAY를 미리 봐요.", "day-next": "다음 DAY를 미리 봐요.", "day-10": "DAY를 10일 건너뛰었어요.", "day-100": "DAY 100 상태예요.",
      "level-prev": "이전 포차 레벨을 확인해요.", "level-next": "다음 포차 레벨을 확인해요.", "level-max": "최대 포차 상태를 열었어요.",
      "stations-max": "모든 조리도구를 LV.5로 맞췄어요.", gold: "개발 보유금 1,000,000원을 추가했어요.", stock: "모든 재료를 가득 채웠어요.", reset: "개발용 저장만 초기화했어요."
    };
    devRefresh(labels[action]);
    announceNewMenus(previousLevel, Progress.stallLevel);
  }

  function initDevTools() {
    if (!IsDev) return;
    const tools = $("#devTools");
    tools.hidden = false;
    $("#stage").dataset.dev = "true";
    $("#devToggle").addEventListener("click", () => {
      tools.classList.toggle("collapsed");
      $("#devToggle").setAttribute("aria-expanded", String(!tools.classList.contains("collapsed")));
    });
    tools.querySelectorAll("[data-dev-action]").forEach(button => button.addEventListener("click", () => devAction(button.dataset.devAction)));
    renderDevTools();
  }

  function payload(element) {
    if (element.matches(".ingredient")) {
      const image = element.querySelector("img");
      return { kind: element.dataset.kind === "drink" ? "drink" : "item", item: element.dataset.item, image: image?.src || "" };
    }
    if (element.matches(".pass-slot")) {
      const passIndex = Number(element.dataset.passSlot);
      const slot = CompletionPassSlots[passIndex];
      if (slot?.recipeId) return { kind: "pass-food", passIndex, recipeId: slot.recipeId, image: assetUrl(MenuCatalog[slot.recipeId].art) };
      return null;
    }
    const appliance = Appliances.find(item => item.id === element.dataset.id);
    if (appliance?.state === "ready") {
      return { kind: "food", id: appliance.id, recipeId: appliance.recipeId, image: assetUrl(foodArtFor(appliance)) };
    }
    if (appliance?.state === "burnt") {
      return { kind: "waste", id: appliance.id, recipeId: appliance.recipeId, image: assetUrl(foodArtFor(appliance)) };
    }
    return null;
  }

  function pointer(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function targetAt(event) {
    const point = pointer(event);
    return document.elementFromPoint(point.x, point.y);
  }

  function moveGhost(event) {
    const point = pointer(event);
    const logicalPoint = window.BoreumiPWA?.toLogicalPoint?.(point) || point;
    const ghost = $("#dragGhost");
    ghost.style.left = logicalPoint.x + "px";
    ghost.style.top = (logicalPoint.y - (event.pointerType === "touch" ? 48 : 18)) + "px";
  }

  function clearOver() {
    $$(".drop-over").forEach(element => element.classList.remove("drop-over"));
  }

  function showGhost(data) {
    const ghost = $("#dragGhost");
    ghost.querySelector("img").src = data.image;
    ghost.querySelector("span").textContent = "";
    ghost.classList.toggle("food-drag", ["food", "pass-food"].includes(data.kind));
    ghost.classList.add("show");
    $("#stage").dataset.dragKind = data.kind;
  }

  function hideGhost() {
    const ghost = $("#dragGhost");
    ghost.classList.remove("show", "food-drag");
    ghost.querySelector("img").removeAttribute("src");
    delete $("#stage").dataset.dragKind;
  }

  function startDrag(event, element) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const data = payload(element);
    if (!data) return;
    event.preventDefault();
    try { element.setPointerCapture?.(event.pointerId); } catch { /* Synthetic QA pointers are not browser-active pointers. */ }
    const point = pointer(event);
    const showImmediately = ["item", "drink"].includes(data.kind);
    State.drag = {
      pointer: event.pointerId,
      data,
      startX: point.x,
      startY: point.y,
      moved: false,
      ghostShown: showImmediately
    };
    if (showImmediately) {
      showGhost(data);
      moveGhost(event);
    }
  }

  function moveDrag(event) {
    if (State.drag?.pointer !== event.pointerId) return;
    event.preventDefault();
    const point = pointer(event);
    if (!State.drag.moved) {
      State.drag.moved = Math.hypot(point.x - State.drag.startX, point.y - State.drag.startY) >= 10;
      if (!State.drag.moved) return;
      if (State.drag.data.kind === "waste") return;
      if (!State.drag.ghostShown) {
        State.drag.ghostShown = true;
        showGhost(State.drag.data);
      }
    }
    moveGhost(event);
    clearOver();
    const target = targetAt(event);
    if (State.drag.data.kind === "item") target?.closest(".appliance")?.classList.add("drop-over");
    else if (State.drag.data.kind === "drink") {
      target?.closest(".guest-slot.active")?.classList.add("drop-over");
      target?.closest(".takeout-order.active")?.classList.add("drop-over");
    } else if (["food", "pass-food"].includes(State.drag.data.kind)) {
      target?.closest(".guest-slot.active")?.classList.add("drop-over");
      target?.closest(".takeout-order.active")?.classList.add("drop-over");
      if (State.drag.data.kind === "food") target?.closest(".pass-slot.empty")?.classList.add("drop-over");
    }
  }

  function endDrag(event) {
    if (State.drag?.pointer !== event.pointerId) return;
    event.preventDefault();
    const target = targetAt(event);
    const data = State.drag.data;
    const wasTap = !State.drag.moved;

    if (["food", "waste"].includes(data.kind) && wasTap) {
      discardAppliance(Appliances.find(item => item.id === data.id));
    } else if (data.kind === "item") {
      const applianceElement = target?.closest(".appliance");
      if (applianceElement) dropItem(Appliances.find(item => item.id === applianceElement.dataset.id), data.item);
      else toast("재료를 조리기구에 놓아주세요.");
    } else if (data.kind === "drink") {
      const guestSlot = target?.closest(".guest-slot.active");
      const takeoutOrder = target?.closest(".takeout-order.active");
      if (guestSlot) serveDrink(data.item, Number(guestSlot.dataset.guest));
      else if (takeoutOrder) deliverTakeoutItem(Number(takeoutOrder.dataset.takeout), data.item);
      else toast("주류를 손님이나 포장 주문표에 놓아주세요.");
    } else if (data.kind === "food") {
      const guestSlot = target?.closest(".guest-slot.active");
      const takeoutOrder = target?.closest(".takeout-order.active");
      const passSlot = target?.closest(".pass-slot.empty");
      const appliance = Appliances.find(item => item.id === data.id);
      if (passSlot) storeFoodInPass(appliance, Number(passSlot.dataset.passSlot));
      else if (guestSlot) serve(appliance, Number(guestSlot.dataset.guest));
      else if (takeoutOrder) deliverTakeoutItem(Number(takeoutOrder.dataset.takeout), data.recipeId, appliance);
      else toast(completionPassCapacityForLevel() ? "완성 음식을 손님, 포장 주문표 또는 완성대에 놓아주세요." : "완성 음식을 손님이나 포장 주문표에 놓아주세요.");
    } else if (data.kind === "pass-food") {
      const guestSlot = target?.closest(".guest-slot.active");
      const takeoutOrder = target?.closest(".takeout-order.active");
      if (wasTap) discardPassSlot(data.passIndex);
      else if (guestSlot) servePassFood(data.passIndex, Number(guestSlot.dataset.guest));
      else if (takeoutOrder) deliverTakeoutItem(Number(takeoutOrder.dataset.takeout), data.recipeId, null, data.passIndex);
      else toast("완성대 음식을 손님이나 포장 주문표에 놓아주세요.");
    } else if (data.kind === "waste") {
      toast("탄 음식은 짧게 눌러 바로 버릴 수 있어요.");
    }

    State.drag = null;
    hideGhost();
    clearOver();
  }

  function bindDrag(element) {
    if (element.dataset.dragBound === "true") return;
    element.dataset.dragBound = "true";
    element.addEventListener("pointerdown", event => startDrag(event, element));
  }

  function setPpomiPose(pose) {
    const element = $("#ppomiPerch");
    const note = element.querySelector("i");
    element.className = `ppomi-perch pose-${pose}`;
    note.textContent = pose === "sleep" ? "Zzz" : pose === "groom" ? "✦" : "♡";
  }

  function startPpomiPoses() {
    const poses = ["sleep", "groom", "wave"];
    let index = 0;
    setPpomiPose(poses[index]);
    setInterval(() => setPpomiPose(poses[index = ++index % poses.length]), 4800);
  }

  function announceFirstDayReady() {
    if (Progress.day !== 1 || Progress.stats.completedDays !== 0) return;
    $("#startButton")?.classList.add("first-day-ready");
    toast("연습 완료! 영업 시작을 누르면 실제 첫날이 시작돼요.");
  }

  function updateMobileCare() {
    const offline = $("#offlineCacheStatus");
    const save = $("#saveRecoveryStatus");
    const pwa = window.BoreumiPWA;
    if (offline) {
      if (document.documentElement.dataset.offline === "unavailable") offline.textContent = "온라인 실행 필요";
      else if (pwa?.offlineCache?.complete) offline.textContent = `${pwa.offlineCache.total}개 준비 완료`;
      else if (pwa?.offlineCache?.total) offline.textContent = `${pwa.offlineCache.loaded}/${pwa.offlineCache.total} 저장 중`;
      else offline.textContent = pwa?.serviceWorkerRegistered ? "기본 화면 준비됨" : "확인 중";
    }
    if (save) {
      let hasBackup = false;
      try { hasBackup = !!localStorage.getItem(BackupKey); } catch { /* Status below reports an error. */ }
      save.textContent = StorageStatus.lastError
        ? "저장 확인 필요"
        : StorageStatus.recovered
          ? "자동 백업 복구됨"
          : hasBackup ? "정상 · 자동 백업 있음" : "정상";
    }
    const importingLocked = State.running;
    if ($("#importSaveButton")) $("#importSaveButton").disabled = importingLocked;
  }

  function exportedProgressText() {
    return JSON.stringify({
      format: "boreumi-ramen-save",
      exportVersion: 1,
      gameVersion: "0.26.3",
      exportedAt: new Date().toISOString(),
      progress: Progress
    }, null, 2);
  }

  function exportProgressFile() {
    saveProgress();
    const blob = new Blob([exportedProgressText()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `boreumi-ramen-day-${Progress.day}-backup.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("현재 진행 상황을 파일로 저장했어요.");
  }

  function importProgressText(text) {
    if (State.running) throw new Error("영업 또는 연습을 마친 뒤 불러와 주세요.");
    const parsed = JSON.parse(text);
    const raw = parsed?.format === "boreumi-ramen-save" ? parsed.progress : parsed;
    if (!raw || typeof raw !== "object" || !Number.isFinite(Number(raw.day))) throw new Error("보름이의 라면포차 저장 파일이 아니에요.");
    Progress = sanitizeProgress(raw);
    if (!saveProgress()) throw new Error("기기에 저장하지 못했어요.");
    applyStallLevel();
    renderHud();
    renderJournal();
    renderJournalBadge();
    updateMobileCare();
    return Progress;
  }

  async function importProgressFile(file) {
    if (!file) return;
    try {
      importProgressText(await file.text());
      toast(`DAY ${Progress.day} 저장 기록을 불러왔어요.`);
      closeHelp(true);
    } catch (error) {
      toast(String(error?.message || "저장 파일을 불러오지 못했어요."));
    } finally {
      $("#importSaveInput").value = "";
    }
  }

  Object.assign(window.BoreumiStorage, {
    backupKey: BackupKey,
    exportText: exportedProgressText,
    importText: importProgressText
  });

  function escapeJournalText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function renderJournalBadge() {
    const badge = $("#journalBadge");
    const button = $("#journalButton");
    if (!badge || !button) return;
    const unread = Math.max(0, Progress.storyLog.length - Progress.journalSeen);
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.hidden = unread === 0;
    button.setAttribute("aria-label", unread ? "포차 일지 열기 · 새 이야기 " + unread + "개" : "포차 일지 열기");
  }

  function renderJournal() {
    const pool = unlockedCustomers();
    if (State.journalCustomerId && !pool.some(customer => customer.id === State.journalCustomerId)) State.journalCustomerId = null;
    const known = pool.filter(customer => regularRecord(customer.id).visits > 0);
    const regulars = pool.filter(customer => ["regular", "old-regular", "family"].includes(relationshipInfo(regularRecord(customer.id)).id));
    $("#journalKnownCount").textContent = known.length + "/" + pool.length;
    $("#journalRegularCount").textContent = regulars.length + "명";
    $("#journalStoryCount").textContent = Progress.storyLog.length + "개";
    const regularGrid = $("#regularGrid");
    regularGrid.innerHTML = pool.map(customer => {
      const record = regularRecord(customer.id);
      const relation = relationshipInfo(record);
      const met = record.visits > 0;
      const selected = State.journalCustomerId === customer.id;
      const nextText = Number.isFinite(relation.next)
        ? "다음 관계까지 " + Math.max(0, relation.next - record.served) + "번"
        : "오래 함께한 사이";
      const portraitStyle = met ? ' style="background-image:url(&quot;' + customer.art + '&quot;)"' : "";
      return '<button type="button" class="regular-card ' + relation.id + (met ? "" : " unmet") + '" data-journal-customer="' + customer.id + '" aria-pressed="' + selected + '">'
        + '<span class="regular-portrait"' + portraitStyle + '></span>'
        + '<small>' + escapeJournalText(relation.label) + '</small>'
        + '<strong>' + escapeJournalText(met ? customer.name : "아직 만나지 못한 손님") + '</strong>'
        + '<p>' + (met ? "방문 " + record.visits + "회 · 함께한 식사 " + record.served + "회" : "영업을 이어가면 만날 수 있어요.") + '</p>'
        + '<p>' + (met ? "좋아하는 조합 " + escapeJournalText(favoriteLabel(customer.id)) : "새로운 인연을 기다리는 중") + '</p>'
        + '<em>' + (met ? nextText + " · 이야기 " + record.chapters + "장" : CustomerStoryCatalog[customer.id].tagline) + '</em>'
        + '</button>';
    }).join("");
    regularGrid.querySelectorAll("[data-journal-customer]").forEach(button => button.addEventListener("click", () => {
      State.journalCustomerId = button.dataset.journalCustomer;
      renderJournal();
      Sound.sfx("drop");
    }));

    const selectedCustomer = CustomerById[State.journalCustomerId];
    $("#journalStoryTitle").textContent = selectedCustomer ? selectedCustomer.name + "님의 이야기" : "모든 손님의 이야기";
    $("#journalAllButton").disabled = !selectedCustomer;
    const entries = Progress.storyLog
      .filter(entry => !State.journalCustomerId || entry.customerId === State.journalCustomerId)
      .slice()
      .reverse();
    $("#storyEntries").innerHTML = entries.length ? entries.map(entry => {
      const customer = CustomerById[entry.customerId] || CustomerCatalog[0];
      return '<article class="story-entry">'
        + '<span class="entry-portrait" style="background-image:url(&quot;' + customer.art + '&quot;)"></span>'
        + '<small><span>DAY ' + entry.day + ' · ' + escapeJournalText(customer.name) + '</span><span>' + escapeJournalText(entry.relationship) + '</span></small>'
        + '<strong>제' + entry.chapter + '장 · ' + escapeJournalText(entry.title) + '</strong>'
        + '<p>' + escapeJournalText(entry.text) + '</p>'
        + '</article>';
    }).join("") : '<div class="story-empty">아직 기록된 이야기가 없어요.<br>손님에게 따뜻한 한 끼를 대접하면 첫 장이 열려요.</div>';
  }

  function openJournal() {
    if (State.tutorialMode) return toast("연습 포차를 마친 뒤 손님 일지를 볼 수 있어요.");
    if (!$("#helpOverlay").classList.contains("hidden")) {
      closeHelp(false);
      State.helpPausedGame = false;
    }
    State.journalPausedGame = State.running && !State.paused;
    if (State.journalPausedGame) {
      State.paused = true;
      Sound.stopBgm();
      $("#stage").classList.add("paused-fx");
    }
    Progress.journalSeen = Progress.storyLog.length;
    saveProgress();
    renderJournal();
    renderJournalBadge();
    $("#journalOverlay").classList.remove("hidden");
    Sound.sfx("drop");
  }

  function closeJournal(resumeGame = true) {
    $("#journalOverlay").classList.add("hidden");
    if (resumeGame && State.journalPausedGame) {
      State.paused = false;
      State.journalPausedGame = false;
      $("#stage").classList.remove("paused-fx");
      Sound.startBgm();
    }
  }

  function openHelp() {
    if (!$("#journalOverlay").classList.contains("hidden")) {
      closeJournal(false);
      State.journalPausedGame = false;
    }
    Tutorial.close(false);
    State.helpPausedGame = State.running && !State.paused;
    if (State.helpPausedGame) {
      State.paused = true;
      Sound.stopBgm();
      $("#stage").classList.add("paused-fx");
    }
    $("#helpOverlay").classList.remove("hidden");
    updateMobileCare();
    window.BoreumiPWA?.ensurePersistentStorage?.();
    Sound.sfx("drop");
  }

  function closeHelp(resumeGame = true) {
    $("#helpOverlay").classList.add("hidden");
    if (resumeGame && State.helpPausedGame) {
      State.paused = false;
      State.helpPausedGame = false;
      $("#stage").classList.remove("paused-fx");
      Sound.startBgm();
    }
  }

  async function browserQA() {
    const qaParams = new URLSearchParams(location.search);
    if (!qaParams.has("qa")) return;
    window.BoreumiQAStep = "awaiting-boot";
    if (window.BoreumiBoot?.readyPromise) await window.BoreumiBoot.readyPromise;
    window.BoreumiQAStep = "running";
    await Promise.all($$(".dock img").map(image => image.complete
      ? Promise.resolve()
      : image.decode().catch(() => undefined)));
    const dockFrameImage = new Image();
    const dockSlotImage = new Image();
    dockFrameImage.src = "assets/art-v012/dock-rack-frame-v1.webp";
    dockSlotImage.src = "assets/art-v012/dock-slot-v1.webp";
    await Promise.all([dockFrameImage.decode().catch(() => undefined), dockSlotImage.decode().catch(() => undefined)]);
    const result = {};
    let pwaManifest = null;
    let pwaCssSource = "";
    let experienceCssSource = "";
    let mobileCssSource = "";
    let storyCssSource = "";
    let bootSource = "";
    let serviceWorkerSource = "";
    let patchCssSource = "";
    let patchV0262CssSource = "";
    let patchV0263CssSource = "";
    try {
      const [manifestResponse, cssResponse, experienceResponse, mobileResponse, storyResponse, bootResponse, workerResponse, patchResponse, patchV0262Response, patchV0263Response] = await Promise.all([
        fetch("app.webmanifest", { cache: "no-store" }),
        fetch("pwa-v024.css", { cache: "no-store" }),
        fetch("experience-v024.css", { cache: "no-store" }),
        fetch("mobile-v024.css", { cache: "no-store" }),
        fetch("story-v024.css", { cache: "no-store" }),
        fetch("boot-v024.js", { cache: "no-store" }),
        fetch("service-worker.js", { cache: "no-store" }),
        fetch("patch-v0261.css", { cache: "no-store" }),
        fetch("patch-v0262.css", { cache: "no-store" }),
        fetch("patch-v0263.css", { cache: "no-store" })
      ]);
      pwaManifest = await manifestResponse.json();
      pwaCssSource = await cssResponse.text();
      experienceCssSource = await experienceResponse.text();
      mobileCssSource = await mobileResponse.text();
      storyCssSource = await storyResponse.text();
      bootSource = await bootResponse.text();
      serviceWorkerSource = await workerResponse.text();
      patchCssSource = await patchResponse.text();
      patchV0262CssSource = await patchV0262Response.text();
      patchV0263CssSource = await patchV0263Response.text();
    } catch {
      // Individual checks below report the unavailable PWA resource.
    }
    const serviceWorkerRegistration = "serviceWorker" in navigator
      ? await Promise.race([navigator.serviceWorker.ready, new Promise(resolve => setTimeout(() => resolve(null), 5000))])
      : null;
    result.pwaManifestPresent = pwaManifest?.name === "보름이의 라면포차"
      && pwaManifest?.start_url?.includes("index.html")
      && pwaManifest?.icons?.some(icon => icon.sizes === "512x512");
    result.landscapeOnlyPwa = pwaManifest?.orientation === "landscape"
      && ["fullscreen", "standalone"].includes(pwaManifest?.display)
      && window.BoreumiPWA?.landscapeRequested === true;
    result.noRotateInstruction = !$(".rotate") && !document.body.textContent.includes("가로 모드로 돌려주세요");
    result.iosStandaloneMetadata = $('meta[name="apple-mobile-web-app-capable"]')?.content === "yes"
      && !!$('link[rel="apple-touch-icon"]')
      && $('meta[name="apple-mobile-web-app-status-bar-style"]')?.content === "black-translucent";
    result.pwaSafeAreaReady = pwaCssSource.includes("safe-area-inset-left")
      && pwaCssSource.includes("safe-area-inset-right")
      && pwaCssSource.includes("100dvh");
    result.portraitLandscapeFallbackReady = pwaCssSource.includes('data-force-landscape="true"')
      && pwaCssSource.includes("rotate(90deg)")
      && typeof window.BoreumiPWA?.toLogicalPoint === "function";
    result.loadingScreenPresent = !!$("#bootLoading")
      && !!$("#bootProgress")
      && bootSource.includes("criticalAssets")
      && experienceCssSource.includes("data-boot=\"ready\"");
    result.loadingCompletesBeforeGame = document.documentElement.dataset.boot === "ready"
      && window.BoreumiBoot?.state.complete === true
      && window.BoreumiBoot?.state.resourcesLoaded === window.BoreumiBoot?.state.resourcesTotal;
    result.parallelCriticalLoading = bootSource.includes("preloadCriticalAssets")
      && bootSource.includes("Promise.all")
      && bootSource.includes('version: "0.26.3"');
    result.mobileSafeCenteredLayout = patchCssSource.includes('data-mobile-layout="true"')
      && patchCssSource.includes("max(42px,var(--pwa-safe-left))")
      && patchCssSource.includes('data-force-landscape="true"][data-mobile-layout="true"]')
      && patchCssSource.includes("padding-bottom:max(18px,var(--pwa-safe-left))")
      && document.documentElement.dataset.mobileLayout === String(new URLSearchParams(location.search).has("mobile") || navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    result.serviceWorkerRegistered = !!serviceWorkerRegistration && window.BoreumiPWA?.serviceWorkerRegistered === true;
    result.offlineGameCacheReady = serviceWorkerSource.includes("CACHE_GAME")
      && serviceWorkerSource.includes("GAME_ASSETS")
      && serviceWorkerSource.includes("request.mode === \"navigate\"");
    result.offlineCacheProgressReady = serviceWorkerSource.includes("CACHE_PROGRESS")
      && !!$("#offlineCacheStatus")
      && typeof window.BoreumiPWA?.offlineCache === "object";
    result.updateFlowReady = !!$("#updateBanner")
      && !!$("#applyUpdateButton")
      && typeof window.BoreumiPWA?.checkForUpdate === "function"
      && serviceWorkerSource.includes("SKIP_WAITING");
    result.mobileTouchComfort = mobileCssSource.includes("touch-action:manipulation")
      && mobileCssSource.includes(".help-button::before")
      && mobileCssSource.includes("inset:-34px");
    result.ambienceLayerPresent = !!$("#atmosphereLayer") && $("#atmosphereLayer").children.length === 3;
    result.fxLayerPresent = !!$("#fxLayer");
    result.soundControlPresent = $("#soundButton")?.getAttribute("aria-pressed") === String(Sound.enabled);
    const soundBeforeToggle = Sound.enabled;
    Sound.setEnabled(!soundBeforeToggle);
    result.soundControlToggles = Sound.enabled !== soundBeforeToggle
      && $("#soundButton").getAttribute("aria-pressed") === String(!soundBeforeToggle);
    Sound.setEnabled(soundBeforeToggle);
    result.stationEffectsPresent = $$(".appliance .cook-fx").length === Appliances.length;
    burstAt($(`[data-id="${Appliances[0].id}"]`), "complete", 4);
    result.feedbackParticlesRender = $$("#fxLayer .fx-particle").length === 4;
    result.tutorialControlsPresent = !!$("#helpButton") && !!$("#tutorialCoach") && !!$("#helpOverlay");
    result.legacySaveMigrationReady = LegacySaveKeys.includes("boreumi-ramen-v025") && SaveKey.includes("v026");
    const recoveryProbe = recoverSerializedProgress("{broken", JSON.stringify({ ...freshProgress(), day: 9 }));
    const exportProbe = JSON.parse(exportedProgressText());
    result.saveRecoveryReady = !!$("#exportSaveButton")
      && !!$("#importSaveButton")
      && recoveryProbe.source === "backup"
      && recoveryProbe.recovered
      && recoveryProbe.progress.day === 9
      && exportProbe.format === "boreumi-ramen-save"
      && exportProbe.gameVersion === "0.26.3";
    result.customerStoryCatalogComplete = CustomerCatalog.every(customer => {
      const profile = CustomerStoryCatalog[customer.id];
      return profile?.chapters?.length === 4
        && profile.arrivals.length >= 2
        && profile.reactions.length >= 2
        && MenuCatalog[profile.favoriteFood]?.kind === "food"
        && MenuCatalog[profile.favoriteDrink]?.kind === "drink";
    });
    result.relationshipStagesReady = relationshipInfo({ visits: 0, served: 0, affection: 0 }).id === "unmet"
      && relationshipInfo({ visits: 2, served: 3, affection: 9 }).id === "familiar"
      && relationshipInfo({ visits: 9, served: 7, affection: 22 }).id === "regular"
      && relationshipInfo({ visits: 30, served: 25, affection: 75 }).id === "family";
    const storyProgressBeforeQA = JSON.stringify(Progress);
    const storyDayLogBeforeQA = State.dayStories.slice();
    const officeRecordQA = regularRecord("office");
    officeRecordQA.visits = 1;
    const storyMomentQA = recordCustomerStory("office", {
      satisfaction: "happy",
      order: createOrder("ramen_plain", "soju")
    });
    result.storyMilestonePersists = storyMomentQA?.chapter === 1
      && storyMomentQA?.title === CustomerStoryCatalog.office.chapters[0].title
      && regularRecord("office").affection === 4
      && Progress.storyLog.at(-1)?.servedAt === 1;
    Progress = decodeProgress(storyProgressBeforeQA);
    State.dayStories = storyDayLogBeforeQA;
    saveProgress();
    openJournal();
    result.journalOverlayReady = !$("#journalOverlay").classList.contains("hidden")
      && $$("#regularGrid .regular-card").length === unlockedCustomers().length
      && !!$("#storyEntries")
      && $("#journalKnownCount").textContent.includes("/");
    result.persistentGuestDialogue = !!$("#storyWhisper")
      && !!$("#closeStoryWhisperButton")
      && patchV0263CssSource.includes("focus-within")
      && patchV0263CssSource.includes("pointer-events:auto")
      && patchV0263CssSource.includes("--whisper-y");
    result.journalTouchLayoutReady = storyCssSource.includes("touch-action:pan-y")
      && storyCssSource.includes(".journal-button")
      && serviceWorkerSource.includes("story-v024.css");
    closeJournal(true);
    Tutorial.start();
    result.tutorialWelcomeVisible = !$("#tutorialCoach").classList.contains("hidden")
      && $("#tutorialTitle").textContent.includes("어서 오세요");
    const tutorialTimeBeforeQA = State.time;
    await new Promise(resolve => setTimeout(resolve, 120));
    result.tutorialIsolatedStage = State.tutorialMode
      && State.running
      && $("#stage").dataset.tutorial === "true"
      && !$("#tutorialStageBadge").hidden
      && State.time === tutorialTimeBeforeQA;
    result.tutorialFixedOrder = Tutorial.activeGuest()?.order?.items.map(item => item.id).join("+") === "ramen_plain+soju"
      && Tutorial.activeGuest()?.patience === Tutorial.activeGuest()?.maxPatience;
    Tutorial.setStep("addNoodle");
    await new Promise(resolve => setTimeout(resolve, 50));
    result.tutorialPathVisible = !$("#tutorialPath").classList.contains("hidden");
    result.tutorialNoodleHighlighted = $('.ingredient[data-item="noodle"]').classList.contains("tutorial-focus");
    result.tutorialPotHighlighted = $$('.appliance.pot').some(element => element.classList.contains("tutorial-focus"));
    Tutorial.close(false);
    openHelp();
    result.helpOverlayOpens = !$("#helpOverlay").classList.contains("hidden");
    result.helpGuideCards = $$("#helpOverlay .help-grid article").length === 5;
    closeHelp(true);
    Tutorial.active = true;
    Tutorial.complete();
    result.tutorialCompletionStored = Tutorial.completed
      && Tutorial.step === "done"
      && localStorage.getItem(TutorialPreferenceKey) === "done";
    Tutorial.close(false);
    Tutorial.completed = false;
    localStorage.removeItem(TutorialPreferenceKey);
    const qaPointerDrag = (source, target, pointerId) => {
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const sourcePoint = { clientX: sourceRect.left + sourceRect.width / 2, clientY: sourceRect.top + sourceRect.height / 2 };
      const targetPoint = { clientX: targetRect.left + targetRect.width / 2, clientY: targetRect.top + targetRect.height / 2 };
      source.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...sourcePoint }));
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...targetPoint }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 0, ...targetPoint }));
    };
    const qaPointerTap = (target, pointerId) => {
      const rect = target.getBoundingClientRect();
      const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...point }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 0, ...point }));
    };
    const tutorialProgressBeforeQA = JSON.stringify(Progress);
    Tutorial.start();
    Tutorial.advance();
    Tutorial.advance();
    const tutorialPotQA = Appliances.find(appliance => appliance.type === "pot" && appliance.state === "empty");
    const tutorialGuestQA = Tutorial.activeGuest();
    dropItem(tutorialPotQA, "noodle");
    tutorialPotQA.cookRemaining = 0;
    completeCooking(tutorialPotQA);
    serve(tutorialPotQA, 0);
    serveDrink("soju", 0);
    const tutorialExplainsStock = Tutorial.step === "stockInfo" && $("#tutorialText").textContent.includes("재료 상점");
    Tutorial.advance();
    result.tutorialPracticeFlowCompletes = Tutorial.step === "done"
      && tutorialGuestQA?.satisfaction === "happy"
      && State.sales === 0
      && State.served === 0
      && JSON.stringify(Progress) === tutorialProgressBeforeQA
      && tutorialExplainsStock;
    Tutorial.close(false);
    result.tutorialFirstDayHandoff = $("#startButton").classList.contains("first-day-ready")
      && !$("#startButton").disabled
      && $("#startButton strong").textContent === "영업 시작";
    Tutorial.completed = false;
    localStorage.removeItem(TutorialPreferenceKey);
    result.startButtonInHud = $("#startButton").parentElement === $(".hud") && $("#startButton").nextElementSibling === $("#pauseButton");
    const startButtonStyle = getComputedStyle($("#startButton"));
    const pauseButtonStyle = getComputedStyle($("#pauseButton"));
    const startButtonRect = $("#startButton").getBoundingClientRect();
    const pauseButtonRect = $("#pauseButton").getBoundingClientRect();
    const hudRect = $(".hud").getBoundingClientRect();
    const dayCell = $(".hud>div:first-child");
    const dayCellRect = dayCell.getBoundingClientRect();
    const dayCellStyle = getComputedStyle(dayCell);
    const buttonStageScale = $("#stage").getBoundingClientRect().width / Config.stage.currentWidth;
    result.matchingHudButtons = startButtonStyle.backgroundImage.includes("start-button-v1.webp")
      && pauseButtonStyle.backgroundImage.includes("pause-button-v2.webp")
      && $("#pauseButton").textContent.trim() === "Ⅱ";
    result.compactPausePlacement = pauseButtonRect.width < startButtonRect.width
      && Math.abs(pauseButtonRect.height - startButtonRect.height) <= 4 * buttonStageScale
      && Math.abs((pauseButtonRect.top + pauseButtonRect.bottom) / 2 - (startButtonRect.top + startButtonRect.bottom) / 2) <= 4 * buttonStageScale;
    result.hudReadability = hudRect.height >= 100 * buttonStageScale
      && $$(".hud>div").every(cell => {
        const cellRect = cell.getBoundingClientRect();
        const labelRect = cell.querySelector("small").getBoundingClientRect();
        const valueRect = cell.querySelector("b").getBoundingClientRect();
        return Math.abs((labelRect.left + labelRect.right) / 2 - (cellRect.left + cellRect.right) / 2) <= 2
          && Math.abs((valueRect.left + valueRect.right) / 2 - (cellRect.left + cellRect.right) / 2) <= 2;
      })
      && dayCellRect.width >= 120 * buttonStageScale
      && dayCellRect.height >= 80 * buttonStageScale
      && dayCellRect.left >= hudRect.left
      && dayCellRect.right <= hudRect.right
      && dayCellStyle.backgroundImage.includes("linear-gradient")
      && parseFloat(dayCellStyle.borderTopWidth) >= 3 * buttonStageScale
      && dayCell.querySelector("small").textContent.trim() === "DAY"
      && dayCell.querySelector("b").textContent.trim() === "1";
    result.dayCellIntegrated = dayCellStyle.backgroundImage.includes("linear-gradient")
      && getComputedStyle(dayCell, "::before").backgroundImage.includes("linear-gradient")
      && getComputedStyle(dayCell, "::after").display === "none"
      && dayCellRect.left >= hudRect.left
      && dayCellRect.right <= startButtonRect.left;
    result.idlePotsContainWater = $$(".sprite-pot").length === 3
      && getComputedStyle($(".sprite-pot"), "::before").backgroundImage.includes("radial-gradient")
      && getComputedStyle($(".sprite-pot"), "::after").backgroundImage.includes("water-surface-v1.webp");
    const idlePotStyle = getComputedStyle($(".sprite-pot"));
    const idleWaterStyle = getComputedStyle($(".sprite-pot"), "::before");
    const idleWaterReflectionStyle = getComputedStyle($(".sprite-pot"), "::after");
    result.raisedIdleWaterLevel = parseFloat(idleWaterStyle.top) < parseFloat(idlePotStyle.height) * .24
      && parseFloat(idleWaterStyle.height) >= parseFloat(idlePotStyle.height) * .17
      && parseFloat(idleWaterReflectionStyle.opacity) >= .2;
    const stationRects = $$(".appliance:not([hidden]) .kitchen-sprite").map(sprite => sprite.getBoundingClientRect());
    result.cookingStationsSpaced = stationRects.every((rect, index) => !index || rect.left - stationRects[index - 1].right >= 2 * buttonStageScale);
    const serviceTableTexture = getComputedStyle($(".service-table"), "::before").backgroundImage;
    result.lineFreeTables = !serviceTableTexture.includes("repeating-linear-gradient")
      && $$(".inventory-rack").every(rack => getComputedStyle(rack).borderImageSource.includes("dock-rack-frame-v1.webp"))
      && getComputedStyle($(".dock"), "::before").display === "none"
      && getComputedStyle($(".counter")).display === "none";
    result.applianceArtworkUnobstructed = getComputedStyle($(".counter")).display === "none"
      && $$(".appliance .art").every(art => getComputedStyle(art).overflow !== "hidden");
    const ppomiRect = $("#ppomiPerch").getBoundingClientRect();
    const guestRowRectBeforeStart = $("#guestRow").getBoundingClientRect();
    const guestTableRect = $(".service-table").getBoundingClientRect();
    result.ppomiAtGuestTableRight = ppomiRect.left >= guestRowRectBeforeStart.right - 2
      && ppomiRect.right <= guestTableRect.right + 2
      && Math.abs(ppomiRect.bottom - guestTableRect.top) <= 4;
    const guestApronStyle = getComputedStyle($(".service-table"), "::after");
    result.guestLowerBodiesScreened = guestApronStyle.backgroundImage.includes("guest-center-wood-panel-v2.webp")
      && parseFloat(guestApronStyle.height) >= 130
      && parseFloat(guestApronStyle.height) <= 145
      && parseFloat(guestApronStyle.width) >= 680
      && parseFloat(guestApronStyle.width) <= 720
      && parseInt(getComputedStyle($(".service-table")).zIndex, 10) > parseInt(getComputedStyle($("#guestRow")).zIndex, 10)
      && parseInt(getComputedStyle($(".characters")).zIndex, 10) > parseInt(getComputedStyle($(".service-table")).zIndex, 10);
    result.guestSidePropsPreserved = parseFloat(guestApronStyle.width) <= 720
      && parseFloat(getComputedStyle($(".service-table")).width) >= 1800;
    result.integratedWoodApronArt = guestApronStyle.backgroundImage.includes("guest-center-wood-panel-v2.webp")
      && guestApronStyle.backgroundSize.includes("cover")
      && parseFloat(guestApronStyle.borderBottomWidth) === 0
      && (guestApronStyle.webkitMaskImage || guestApronStyle.maskImage).includes("linear-gradient")
      && guestApronStyle.filter.includes("brightness(1.16)");
    const guestApronMask = guestApronStyle.webkitMaskImage || guestApronStyle.maskImage;
    result.naturalWoodApronEnds = guestApronMask.includes("4%")
      && guestApronMask.includes("96%")
      && guestApronStyle.filter.includes("brightness(1.16)");
    result.pochaHudArt = getComputedStyle($(".hud")).backgroundImage.includes("hud-panel-v1.webp")
      && parseFloat(getComputedStyle($(".hud")).borderTopWidth) === 0;
    const dockItemNames = $$(".dock .item-name").map(label => label.textContent.trim());
    result.referenceStyleItemLabels = $$(".appliance label").length === 0
      && dockItemNames.length >= 8
      && ["면", "계란", "군만두", "오뎅", "소주", "맥주", "소맥", "막걸리"].every(name => dockItemNames.includes(name));
    result.noDailyMaterialsCell = !$(".dock-label");
    result.sharedDisplayRacks = $$(".ingredient-rack .ingredient").length >= 2
      && $$(".drink-rack .drink-item").length === 4
      && $$(".snack-rack .ingredient").length === 2
      && !$(".dock-tip");
    result.referenceStyleItemCards = $$(".ingredient,.drink-item").every(item => {
      const style = getComputedStyle(item);
      return parseFloat(style.borderTopWidth) === 0
        && style.backgroundImage.includes("dock-slot-v1.webp")
        && parseFloat(style.borderRadius) >= 10 * buttonStageScale;
    });
    result.referenceStyleDock = $$(".rack-title").map(title => title.textContent.trim()).join("|") === "라면 재료|주류|안주"
      && $$(".inventory-rack").every(rack => getComputedStyle(rack).borderImageSource.includes("dock-rack-frame-v1.webp"));
    result.handPaintedDockArt = dockFrameImage.complete
      && dockFrameImage.naturalWidth === 949
      && dockFrameImage.naturalHeight === 154
      && dockSlotImage.complete
      && dockSlotImage.naturalWidth === 240
      && dockSlotImage.naturalHeight === 112;
    result.extensibleInventory = InventoryCategories.length === 3
      && Config.layout.inventoryPageSize === 4
      && Config.layout.inventoryCategories.join("|") === "ramen|drinks|anju"
      && $$(".inventory-rack").length === 3
      && $$(".inventory-rack").every(rack => rack.dataset.pageSize === "4" && rack.querySelectorAll(".rack-page").length === 2)
      && Number(getComputedStyle($(".ingredient-rack")).flexGrow) >= 2
      && Number(getComputedStyle($(".drink-rack")).flexGrow) >= 2
      && Number(getComputedStyle($(".snack-rack")).flexGrow) >= 2;
    const ramenCategory = InventoryCategories.find(category => category.id === "ramen");
    const originalRamenItems = ramenCategory.items;
    ramenCategory.items = [...originalRamenItems,
      { ...originalRamenItems[0], id: "qa-noodle-2", label: "추가 면 1" },
      { ...originalRamenItems[1], id: "qa-egg-2", label: "추가 계란" },
      { ...originalRamenItems[0], id: "qa-noodle-3", label: "추가 면 2" }];
    InventoryPages.ramen = 0;
    renderDockCategory("ramen");
    const ramenNext = $(".ingredient-rack .rack-next");
    const paginationAppeared = !ramenNext.hidden && !ramenNext.disabled;
    ramenNext.click();
    const expectedSecondPageItems = Math.max(1, ramenCategory.items.length - Config.layout.inventoryPageSize);
    const secondInventoryPage = InventoryPages.ramen === 1
      && $$(".ingredient-rack .catalog-item").length === expectedSecondPageItems
      && $(".ingredient-rack .rack-page-index").textContent === "2/2";
    ramenCategory.items = originalRamenItems;
    InventoryPages.ramen = 0;
    renderDockCategory("ramen");
    result.inventoryPaginationFlow = paginationAppeared
      && secondInventoryPage
      && !$(".ingredient-rack .rack-next").hidden
      && $$(".ingredient-rack .catalog-item").length === Config.layout.inventoryPageSize;
    const drinkArt = {
      soju: "drink-soju-v1.webp",
      beer: "drink-beer-v1.webp",
      somaek: "drink-somaek-v1.webp",
      makgeolli: "drink-makgeolli-v1.webp"
    };
    result.drinkArtV1 = Object.entries(drinkArt).every(([drink, file]) => IngredientCatalog[drink]?.art.endsWith(file));
    result.emptySeatsBeforeStart = $$(".guest-slot:not([hidden]):not(.active)").length === guestCapacityForLevel()
      && $$(".guest-slot:not([hidden]) .guest-seat").length === guestCapacityForLevel();
    result.level1StationStart = $$(".appliance:not([hidden])").length === 4
      && $$(".appliance.pot:not([hidden])").length === 2
      && $$(".appliance.grill:not([hidden])").length === 1
      && $$(".appliance.oden:not([hidden])").length === 1;
    result.idleFrontCenter = $("#boreumi").dataset.mode === "idle" && $("#boreumi").dataset.pose === "idle";
    $("#startButton").click();
    const runningButtonRect = $("#startButton").getBoundingClientRect();
    result.startButton = State.running
      && getComputedStyle($("#startButton")).display !== "none"
      && $("#startButton").disabled
      && $("#startButton strong").textContent.trim() === "영업중"
      && Math.abs(runningButtonRect.left - startButtonRect.left) <= 1
      && Math.abs(runningButtonRect.top - startButtonRect.top) <= 1;
    result.fiveMinuteBusinessTime = Config.daySeconds === 300 && State.time === 300 && $("#time").textContent === "05:00";
    const lockedDayTimer = State.dayTimer;
    const lockedTime = State.time;
    $("#startButton").click();
    result.runningStartLocked = State.running
      && $("#startButton").disabled
      && State.dayTimer === lockedDayTimer
      && State.time === lockedTime;
    $("#pauseButton").click();
    result.pauseButton = State.paused && !$("#pauseOverlay").classList.contains("hidden");
    $("#resumeButton").click();
    result.resumeButton = !State.paused && $("#pauseOverlay").classList.contains("hidden");
    const supplyGoldBefore = Progress.gold;
    const supplyNoodleBefore = Progress.inventory.noodle;
    Progress.gold = 1000;
    Progress.inventory.noodle = 0;
    renderHud();
    $("#quickSupplyButton").click();
    const businessShopOpened = State.running
      && State.paused
      && State.supplyPausedGame
      && !$("#supplyShopOverlay").classList.contains("hidden");
    $(`[data-supply-id="noodle"] [data-buy="1"]`).click();
    const boughtDuringBusiness = Progress.inventory.noodle === 1
      && Progress.gold === 1000 - IngredientCatalog.noodle.unitCost;
    $("#closeSupplyShopButton").click();
    result.businessSupplyShop = businessShopOpened
      && boughtDuringBusiness
      && !State.paused
      && !State.supplyPausedGame
      && $("#supplyShopOverlay").classList.contains("hidden");
    Progress.gold = supplyGoldBefore;
    Progress.inventory.noodle = supplyNoodleBefore;
    InventoryCategories.forEach(category => renderDockCategory(category.id));
    renderHud();
    activateGuest(0);
    const qaFirstCustomerId = Guests[0].customerId;
    result.arrivalState = $$(".guest-slot:not([hidden]).active").length === 1
      && $$(".guest-slot:not([hidden]):not(.active)").length === guestCapacityForLevel() - 1;
    result.randomCustomerPool = CustomerCatalog.length === 18
      && unlockedCustomers().length === 3
      && CustomerCatalog.every(customer => customer.id && customer.name && customer.art.endsWith(".webp"))
      && CustomerById[qaFirstCustomerId]?.name === $(`[data-guest="0"] .guest-art`).getAttribute("aria-label");
    result.combinationOrderAssigned = Guests[0].order?.items.length === 2
      && MenuCatalog[Guests[0].order.items[0].id].kind === "food"
      && MenuCatalog[Guests[0].order.items[1].id].kind === "drink"
      && $$(`[data-guest="0"] .order-item`).length === 2
      && $$(`[data-guest="0"] .order-plus`).length === 1;
    const sampledRandomOrders = new Set();
    for (let sample = 0; sample < 128; sample += 1) {
      const sampleGuest = { order: null };
      assignOrder(sampleGuest);
      sampledRandomOrders.add(sampleGuest.order.id);
    }
    const qaFoodPool = unlockedFoodOrderPool();
    const qaDrinkPool = drinkOrderPool();
    result.unweightedRandomOrders = qaFoodPool.length >= 4
      && qaDrinkPool.length === 4
      && sampledRandomOrders.size >= Math.min(qaFoodPool.length * qaDrinkPool.length, 12);
    Guests[0].order = createOrder("ramen_plain", "soju");
    renderGuest(Guests[0]);
    result.menuCatalogIncludesDrinks = ["soju", "beer", "somaek", "makgeolli"].every(id => MenuCatalog[id]?.kind === "drink" && MenuCatalog[id].price > 0);
    result.drinksAreDraggable = $$(".drink-rack .drink-item").every(item => item.matches("button.ingredient") && payload(item)?.kind === "drink");
    const hallPatienceElement = $(`[data-guest="0"] .patience`);
    result.guestsWaitForeverUi = Config.guests.waitsForever
      && hallPatienceElement.hidden
      && getComputedStyle(hallPatienceElement).display === "none"
      && hallPatienceElement.getAttribute("aria-label").includes("모두 나올 때까지");
    const mobileControls = [$("#walletBadge"), $("#quickSupplyButton"), $("#recipeButton"), $("#journalButton"), $("#helpButton"), $("#soundButton")];
    result.topControlsNoOverlap = mobileControls.every((control, index) => {
      const rect = control.getBoundingClientRect();
      return mobileControls.slice(index + 1).every(other => {
        const otherRect = other.getBoundingClientRect();
        return rect.right <= otherRect.left
          || rect.left >= otherRect.right
          || rect.bottom <= otherRect.top
          || rect.top >= otherRect.bottom;
      });
    });
    const visibleOrderBubbles = $$(".guest-slot.active .bubble");
    result.orderUiNoOverlap = visibleOrderBubbles.every(bubble => {
        const bubbleRect = bubble.getBoundingClientRect();
        return mobileControls.every(control => {
          const controlRect = control.getBoundingClientRect();
          return controlRect.right <= bubbleRect.left
            || controlRect.left >= bubbleRect.right
            || controlRect.bottom <= bubbleRect.top
            || controlRect.top >= bubbleRect.bottom;
        });
      });
    result.mobileOrderUiNoOverlap = document.documentElement.dataset.mobileLayout !== "true" || result.orderUiNoOverlap;
    result.healingGameTiming = Config.daySeconds === 300
      && Config.guests.waitsForever
      && Config.guests.wrongPenaltyMs === 0
      && !Config.cooking.burns
      && Config.cooking.defaultBurnMs === 0;
    const topping = $("[data-item='dumpling']");
    const toppingPayload = payload(topping);
    showGhost(toppingPayload);
    result.ingredientDragArt = !!payload($("[data-item='noodle']")).image && !!toppingPayload.image;
    const ingredientArtV4 = {
      noodle: "ingredient-noodle-v4.webp",
      egg: "ingredient-egg-v4.webp",
      dumpling: "ingredient-dumpling-v4.webp",
      oden: "ingredient-oden-v4.webp"
    };
    await Promise.all(Object.keys(ingredientArtV4).map(item => {
      const image = $(`[data-item="${item}"] img`);
      return image?.complete ? Promise.resolve() : image?.decode().catch(() => undefined);
    }));
    result.ingredientArtV4 = Object.entries(ingredientArtV4).every(([item, file]) => {
      const image = $(`[data-item="${item}"] img`);
      return image?.src.endsWith(file) && image.complete && image.naturalWidth === 512 && image.naturalHeight === 512;
    });
    result.ingredientGhostIllustration = $("#dragGhost").classList.contains("show")
      && $("#dragGhost img").src === toppingPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    hideGhost();
    const odenSprite = $(".sprite-oden").getBoundingClientRect();
    const odenArt = $(`[data-id="${Appliances[5].id}"] .art`).getBoundingClientRect();
    result.odenEmptyPadding = odenSprite.left > odenArt.left + 5 * buttonStageScale && odenSprite.right < odenArt.right - 5 * buttonStageScale;
    result.odenIdleArtV3 = getComputedStyle($(".sprite-oden")).backgroundImage.includes("kitchen-oden-v3.webp");
    const emptyApplianceArt = $(`[data-id="${Appliances[0].id}"] .art`);
    const emptyApplianceStyle = getComputedStyle(emptyApplianceArt);
    result.appliancePanelsRemoved = emptyApplianceStyle.borderTopWidth === "0px"
      && emptyApplianceStyle.backgroundImage === "none"
      && emptyApplianceStyle.backgroundColor === "rgba(0, 0, 0, 0)"
      && emptyApplianceStyle.boxShadow === "none";
    const signStyle = getComputedStyle($(".sign"));
    result.fullMoonSign = signStyle.backgroundImage.includes("sign-full-moon-v1.webp")
      && parseFloat(signStyle.borderTopWidth) === 0;

    result.recipeCatalog = Object.keys(RecipeCatalog).length === 11
      && Object.values(RecipeCatalog).every(recipe => recipe.cookMs > 0 && !recipe.burns && recipe.burnMs === 0)
      && [RecipeCatalog.ramen_scallion, RecipeCatalog.ramen_kimchi, RecipeCatalog.ramen_cheese].every(recipe => recipe.cookingSprite?.startsWith("cooking-ramen-"))
      && RecipeCatalog.ramen_plain.ingredients.join("|") === "noodle"
      && RecipeCatalog.ramen_egg.ingredients.join("|") === "noodle|egg";
    result.v025IngredientMenuSystem = Object.keys(IngredientCatalog).length === 11
      && ["scallion", "kimchi", "cheese"].every(id => IngredientCatalog[id].unitCost > 0 && IngredientCatalog[id].targetStock > 0)
      && unlockedFoodOrderPool(1).length === 4
      && unlockedFoodOrderPool(2).includes("ramen_scallion")
      && unlockedFoodOrderPool(3).includes("ramen_kimchi")
      && unlockedFoodOrderPool(4).includes("ramen_cheese");
    const toppingSpriteProbe = document.createElement("i");
    toppingSpriteProbe.className = "kitchen-sprite sprite-cooking-ramen-kimchi";
    document.body.append(toppingSpriteProbe);
    result.naturalCookingToppingArt = getComputedStyle(toppingSpriteProbe).backgroundImage.includes("food-ramen-kimchi-v1.webp")
      && getComputedStyle(toppingSpriteProbe, "::after").display === "none";
    toppingSpriteProbe.remove();
    const supplyStockBeforeQA = Progress.inventory.noodle;
    Progress.inventory.noodle = 0;
    const supplyProbe = supplyPlan();
    result.v025SupplyPlanning = supplyProbe.quantity >= IngredientCatalog.noodle.targetStock
      && supplyProbe.total >= IngredientCatalog.noodle.targetStock * IngredientCatalog.noodle.unitCost;
    Progress.inventory.noodle = supplyStockBeforeQA;
    result.v026RecipeMenuSystem = ["ramen_egg_scallion", "ramen_kimchi_egg", "ramen_cheese_egg", "ramen_kimchi_cheese"].every(id => RecipeCatalog[id] && MenuCatalog[id] && MenuUnlockLevel[id] >= 2)
      && $("#recipeButton") && $("#recipeOverlay") && $("#recipeSections");
    const comboSpriteProbe = document.createElement("i");
    comboSpriteProbe.className = "kitchen-sprite sprite-cooking-ramen-kimchi-cheese";
    document.body.append(comboSpriteProbe);
    result.naturalComboCookingArt = getComputedStyle(comboSpriteProbe).backgroundImage.includes("food-ramen-kimchi-cheese-v1.webp")
      && getComputedStyle(comboSpriteProbe, "::before").display === "none"
      && getComputedStyle(comboSpriteProbe, "::after").display === "none";
    comboSpriteProbe.remove();
    const comboStockBefore = { ...Progress.inventory };
    const comboLevelBefore = Progress.stallLevel;
    Progress.stallLevel = 5;
    applyStallLevel();
    resetAppliance(Appliances[0]);
    dropItem(Appliances[0], "noodle");
    dropItem(Appliances[0], "kimchi");
    dropItem(Appliances[0], "cheese");
    result.v026ApprovedComboResolves = Appliances[0].recipeId === "ramen_kimchi_cheese" && Appliances[0].ingredients.length === 3;
    const invalidBefore = Appliances[0].ingredients.length;
    dropItem(Appliances[0], "egg");
    result.v026ThirdToppingRejected = Appliances[0].ingredients.length === invalidBefore;
    Progress.inventory = comboStockBefore;
    Progress.stallLevel = comboLevelBefore;
    applyStallLevel();
    resetAppliance(Appliances[0]);
    Progress.inventory.noodle = IngredientCatalog.noodle.targetStock;
    Progress.inventory.egg = IngredientCatalog.egg.targetStock;
    Progress.inventory.dumpling = IngredientCatalog.dumpling.targetStock;
    Progress.inventory.oden = IngredientCatalog.oden.targetStock;
    InventoryCategories.forEach(category => renderDockCategory(category.id));
    dropItem(Appliances[2], "dumpling");
    result.invalidApplianceRejected = Appliances[2].state === "empty" && Appliances[2].ingredients.length === 0;
    dropItem(Appliances[2], "egg");
    result.addonRequiresBase = Appliances[2].state === "empty" && Appliances[2].ingredients.length === 0;
    qaPointerDrag($("[data-item='noodle']"), $(`[data-id="${Appliances[1].id}"]`), 901);
    result.pointerIngredientDrag = Appliances[1].state === "cooking"
      && Appliances[1].recipeId === "ramen_plain"
      && !$("#dragGhost").classList.contains("show");
    resetAppliance(Appliances[1]);

    dropItem(Appliances[0], "noodle");
    dropItem(Appliances[1], "noodle");
    dropItem(Appliances[1], "egg");
    result.eggPose = $("#boreumi").dataset.pose === "egg";
    const cookingBoreumi = $("#boreumi");
    const cookingLaneBox = stageBoxFor($(".characters"));
    const cookingTargetBox = stageBoxFor($(`[data-id="${Appliances[1].id}"]`));
    const cookingTargetDelta = (
      cookingLaneBox.left + parseFloat(cookingBoreumi.style.left) + cookingBoreumi.offsetWidth / 2
      - cookingTargetBox.left - cookingTargetBox.width / 2
    );
    result.cookingCharacterTargetsStation = Math.abs(cookingTargetDelta) <= 2;
    const eggIngredientCount = Appliances[1].ingredients.length;
    dropItem(Appliances[1], "egg");
    result.duplicateAddonRejected = Appliances[1].ingredients.length === eggIngredientCount;
    dropItem(Appliances[3], "dumpling");
    result.grillPose = $("#boreumi").dataset.pose === "grill";
    dropItem(Appliances[5], "oden");
    result.odenPose = $("#boreumi").dataset.pose === "oden";
    result.cookingUpperBody = $("#boreumi").dataset.mode === "cooking" && parseFloat(getComputedStyle($("#boreumi")).height) >= 230;
    result.appliancesPersist = $$(".kitchen-sprite").length === 6;
    result.immediateCooking = Appliances[0].state === "cooking" && Appliances[1].state === "cooking" && Appliances[3].state === "cooking" && Appliances[5].state === "cooking";
    result.recipeResolution = Appliances[0].recipeId === "ramen_plain"
      && Appliances[1].recipeId === "ramen_egg"
      && Appliances[3].recipeId === "grilled_dumpling"
      && Appliances[5].recipeId === "warm_oden";

    const remainingBeforeCookingPause = Appliances[0].cookRemaining;
    const patienceBeforePause = Guests[0].patience;
    $("#pauseButton").click();
    await new Promise(resolve => setTimeout(resolve, 180));
    result.cookingPauses = State.paused
      && Math.abs(Appliances[0].cookRemaining - remainingBeforeCookingPause) < 1;
    result.patiencePauses = State.paused
      && Math.abs(Guests[0].patience - patienceBeforePause) < 1;
    $("#resumeButton").click();
    if (qaParams.has("previewCook")) {
      State.paused = true;
      await new Promise(resolve => setTimeout(resolve, 2600));
      State.paused = false;
      State.cookingClock = performance.now();
    }

    await new Promise(resolve => setTimeout(resolve, 4400));
    result.independentTimers = Appliances[0].state === "ready" && Appliances[1].state === "ready" && Appliances[3].state === "ready" && Appliances[5].state === "ready";
    result.noEggPlainRamen = !!$(".sprite-ramen-plain") && getComputedStyle($(".sprite-ramen-plain")).backgroundImage.includes("food-ramen-plain-no-scallion-v1");
    result.eggRamenWithoutScallion = !!$(".sprite-ramen-egg")
      && getComputedStyle($(".sprite-ramen-egg")).backgroundImage.includes("food-ramen-egg-no-scallion-v1.webp")
      && FoodArt.potEgg.includes("food-ramen-egg-no-scallion-v1.webp");
    result.completeFoodArt = !!$(".sprite-dumpling") && getComputedStyle($(".sprite-dumpling")).backgroundImage.includes("food-dumpling-v2");
    result.odenStaysInBar = !!$(".sprite-cooking-oden")
      && getComputedStyle($(".sprite-cooking-oden")).backgroundImage.includes("cooking-oden-v2.webp")
      && !$(".sprite-oden-food");
    takeApplianceServing(Appliances[5]);
    const odenTwoArt = getComputedStyle($(".sprite-cooking-oden-two")).backgroundImage;
    takeApplianceServing(Appliances[5]);
    const odenOneArt = getComputedStyle($(".sprite-cooking-oden-one")).backgroundImage;
    takeApplianceServing(Appliances[5]);
    result.odenContinuousServing = Appliances[5].state === "ready"
      && Appliances[5].recipeId === "warm_oden"
      && Appliances[5].servingsShown === 1
      && odenTwoArt.includes("cooking-oden-two-v1.webp")
      && odenOneArt.includes("cooking-oden-one-v1.webp")
      && $("[data-id='oden-0']").dataset.odenCount === "1";
    const readyPayload = payload($(`[data-id="${Appliances[0].id}"]`));
    result.sameReadyDragArt = readyPayload?.image.includes("food-ramen-plain-no-scallion-v1.webp");
    const plainCookingProbe = document.createElement("i");
    plainCookingProbe.className = "kitchen-sprite sprite-cooking-ramen";
    document.body.append(plainCookingProbe);
    const scallionCookingProbe = document.createElement("i");
    scallionCookingProbe.className = "kitchen-sprite sprite-cooking-ramen-scallion";
    document.body.append(scallionCookingProbe);
    const scallionReadyProbe = document.createElement("i");
    scallionReadyProbe.className = "kitchen-sprite sprite-ramen-scallion";
    document.body.append(scallionReadyProbe);
    result.plainRamenHasNoDefaultScallion = getComputedStyle(plainCookingProbe).backgroundImage.includes("cooking-ramen-plain-no-scallion-v1.webp")
      && getComputedStyle(plainCookingProbe, "::after").backgroundImage === "none"
      && getComputedStyle(scallionCookingProbe).backgroundImage.includes("food-ramen-scallion-v1.webp")
      && getComputedStyle(scallionCookingProbe, "::after").display === "none"
      && getComputedStyle($(".sprite-ramen-plain")).backgroundImage.includes("food-ramen-plain-no-scallion-v1.webp")
      && getComputedStyle(scallionReadyProbe).backgroundImage.includes("food-ramen-scallion-v1.webp");
    plainCookingProbe.remove();
    scallionCookingProbe.remove();
    scallionReadyProbe.remove();
    showGhost(readyPayload);
    result.readyGhostSameIllustration = $("#dragGhost").classList.contains("food-drag")
      && $("#dragGhost img").src === readyPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    hideGhost();
    result.customerCharacterDropTarget = $(`[data-guest="0"] .guest-art`).closest(".guest-slot.active")?.dataset.guest === "0";
    const salesBeforeWrongOrder = State.sales;
    const patienceBeforeWrongOrder = Guests[0].patience;
    serve(Appliances[3], 0);
    result.wrongOrderRejected = Appliances[3].state === "ready"
      && Guests[0].active
      && State.sales === salesBeforeWrongOrder
      && Guests[0].patience === patienceBeforeWrongOrder;
    result.wrongOrderHasNoTimerPenalty = $(`[data-guest="0"]`).classList.contains("wrong-order")
      && $(`[data-guest="0"] .patience`).hidden;
    const wasteBeforeReadyTap = State.waste;
    qaPointerTap($(`[data-id="${Appliances[3].id}"]`), 904);
    result.readyTapDiscards = Appliances[3].state === "empty"
      && State.waste === wasteBeforeReadyTap + 1
      && !$("#dragGhost").classList.contains("show");

    Appliances[5].burnRemaining = 0;
    Appliances[1].burnRemaining = 0;
    burnFood(Appliances[5]);
    burnFood(Appliances[1]);
    await new Promise(resolve => setTimeout(resolve, 160));
    result.allFoodKeepsWarm = [Appliances[1], Appliances[5]].every(appliance => appliance.state === "ready"
      && effectiveBurnMs(recipeFor(appliance)) === 0
      && payload($(`[data-id="${appliance.id}"]`))?.kind === "food"
      && $(`[data-id="${appliance.id}"]`).classList.contains("keeps-warm"));
    result.noBurntFoodState = !Appliances.some(appliance => appliance.state === "burnt")
      && Object.values(RecipeCatalog).every(recipe => !recipe.burns && recipe.burnMs === 0);
    result.dragDiscardRemoved = !$("#discardBin") && !document.querySelector(".discard-bin");
    const wasteBeforeDiscard = State.waste;
    qaPointerTap($(`[data-id="${Appliances[1].id}"]`), 905);
    result.readyFoodCanBeCleared = Appliances[1].state === "empty" && !$("#dragGhost").classList.contains("show");
    result.discardResetsStation = Appliances[1].state === "empty"
      && Appliances[1].recipeId === null
      && Appliances[1].ingredients.length === 0
      && State.waste === wasteBeforeDiscard + 1;
    if (qaParams.has("holdReady")) await new Promise(resolve => setTimeout(resolve, 1400));
    qaPointerDrag($(`[data-id="${Appliances[0].id}"]`), $(`[data-guest="0"] .guest-art`), 903);
    result.foodPointerDrag = Appliances[0].state === "empty" && !Guests[0].serving && !$("#dragGhost").classList.contains("show");
    result.partialOrderStays = Guests[0].active
      && !Guests[0].serving
      && Guests[0].order.items.find(item => item.id === "ramen_plain")?.fulfilled
      && !Guests[0].order.items.find(item => item.id === "soju")?.fulfilled
      && $(`[data-guest="0"] [data-order-item="ramen_plain"]`).classList.contains("fulfilled");
    result.serveBackPose = $("#boreumi").dataset.mode === "serving" && $("#boreumi").dataset.pose === "serve";
    const servingBoreumi = $("#boreumi");
    const servingLaneBox = stageBoxFor($(".characters"));
    const servingGuestBox = stageBoxFor($(`[data-guest="0"]`));
    const servingTargetDelta = (
      servingLaneBox.left + parseFloat(servingBoreumi.style.left) + servingBoreumi.offsetWidth / 2
      - servingGuestBox.left - servingGuestBox.width / 2
    );
    result.servingCharacterTargetsGuest = Math.abs(servingTargetDelta) <= 2;
    const serveRect = $("#boreumi").getBoundingClientRect();
    const guestRowRect = $("#guestRow").getBoundingClientRect();
    const stageScale = $("#stage").getBoundingClientRect().width / Config.stage.currentWidth;
    const serveClearance = (serveRect.bottom - guestRowRect.bottom) / stageScale;
    result.serveOnFloor = parseFloat(getComputedStyle($("#boreumi")).height) >= 290 && serveClearance > 90;
    const sojuButton = $(`.drink-item[data-item="soju"]`);
    const sojuPayload = payload(sojuButton);
    showGhost(sojuPayload);
    result.drinkGhostIllustration = $("#dragGhost").classList.contains("show")
      && $("#dragGhost img").src === sojuPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    hideGhost();
    qaPointerDrag(sojuButton, $(`[data-guest="0"] .bubble`), 906);
    result.drinkPointerServe = Guests[0].serving
      && Guests[0].order.items.every(item => item.fulfilled)
      && State.sales === MenuCatalog.ramen_plain.price + MenuCatalog.soju.price
      && State.served === 1;
    result.storyStartsAndPersists = Progress.regulars[qaFirstCustomerId].visits === 1
      && Progress.regulars[qaFirstCustomerId].served === 1
      && Progress.regulars[qaFirstCustomerId].chapters === 1
      && Progress.storyLog.at(-1)?.customerId === qaFirstCustomerId
      && Progress.storyLog.at(-1)?.day === 1;
    result.satisfactionAssigned = ["happy", "okay", "tired"].includes(Guests[0].satisfaction)
      && $(`[data-guest="0"]`).classList.contains("satisfied")
      && getComputedStyle($(`[data-guest="0"] .satisfaction`)).display === "grid";
    await new Promise(resolve => setTimeout(resolve, 850));
    result.guestLeavesAfterServe = !Guests[0].active && !$(`[data-guest="0"]`).classList.contains("active");
    result.returnsToIdle = $("#boreumi").dataset.mode === "idle" && $("#boreumi").dataset.pose === "idle";

    if (!Guests[1].active) activateGuest(1);
    if (!Guests[2].active) activateGuest(2);
    const currentCustomerIds = Guests.filter(guest => guest.active).map(guest => guest.customerId);
    result.noDuplicateSeatedCustomers = currentCustomerIds.length === new Set(currentCustomerIds).size;
    const waitingGuestPatience = Guests[2].patience;
    const missedBeforeTimeout = State.missed;
    const waitingCustomerId = Guests[1].customerId;
    const missedRecordBefore = Progress.regulars[waitingCustomerId].missed;
    Guests[1].patience = 60;
    renderPatience(Guests[1]);
    await new Promise(resolve => setTimeout(resolve, 180));
    result.unservedGuestWaitsForever = Guests[1].active
      && !Guests[1].serving
      && Guests[1].satisfaction === "waiting"
      && Guests[1].patience === 60
      && State.missed === missedBeforeTimeout
      && Progress.regulars[waitingCustomerId].missed === missedRecordBefore
      && !$(`[data-guest="1"]`).classList.contains("angry");
    result.allHallGuestsWaitForever = Guests[2].active
      && !Guests[2].serving
      && Guests[2].patience === waitingGuestPatience;
    await new Promise(resolve => setTimeout(resolve, 760));
    result.waitingGuestStaysWithoutSale = Guests[1].active
      && State.sales === MenuCatalog.ramen_plain.price + MenuCatalog.soju.price;

    const stage = $("#stage").getBoundingClientRect();
    const dock = $(".dock").getBoundingClientRect();
    const left = $("#cookLeft").getBoundingClientRect();
    const right = $("#cookRight").getBoundingClientRect();
    result.landscape = stage.width > stage.height;
    result.noDockOverlap = dock.top >= Math.max(left.bottom, right.bottom) - 2;
    result.adaptive1080Stage = Config.stage.currentWidth >= Config.stage.safeWidth
      && Config.stage.currentWidth <= Config.stage.maxWidth
      && parseFloat(getComputedStyle($("#stage")).height) === Config.stage.height;
    result.futureExpansionReserved = Config.layout.futureGuestCapacity >= 10
      && Config.layout.reservedStations.includes("takeout")
      && Config.layout.reservedStations.includes("service-pass");

    result.managementProgressDefaults = Progress.day === 1
      && Progress.gold === 0
      && Progress.stallLevel === 1
      && Object.values(Progress.stationLevels).every(level => level === 1)
      && $("#dayNumber").textContent === "1"
      && $("#goalAmount").textContent === money(cumulativeSales());
    const walletRect = $("#walletBadge").getBoundingClientRect();
    result.walletBadgeReadable = walletRect.top >= hudRect.bottom - 2
      && walletRect.right <= stage.right
      && $("#walletGold").textContent === "0원"
      && $("#stallLevel").textContent === String(effectiveStallLevel());
    result.managementUpgradeCatalog = Object.keys(StationUpgradeCatalog).join("|") === "pot|grill|oden"
      && Object.values(StationUpgradeCatalog).every(upgrade => upgrade.costs.length === 4
        && upgrade.costs.every((cost, index) => cost > 0 && (!index || cost > upgrade.costs[index - 1])))
      && StallUpgradeCatalog.costs.length === 4
      && StallUpgradeCatalog.costs.every((cost, index) => !index || cost > StallUpgradeCatalog.costs[index - 1]);

    State.sales = 10500;
    State.served = 3;
    State.missed = 1;
    State.takeoutServed = 0;
    State.takeoutMissed = 0;
    State.takeoutPenalty = 0;
    State.waste = 2;
    State.ratings = { happy: 2, okay: 1, tired: 0 };
    const expectedServiceBonus = State.ratings.happy * 400 + State.ratings.okay * 200;
    const expectedReward = State.sales + expectedServiceBonus;
    const expectedCumulativeSales = Progress.stats.totalSales + State.sales;
    resetGuests();
    Guests[0].active = true;
    State.closing = true;
    State.time = 0;
    $("#stage").dataset.closing = "true";
    renderGuest(Guests[0]);
    const waitsForLastGuest = !checkClosingComplete() && State.running && State.closing;
    Guests[0].active = false;
    renderGuest(Guests[0]);
    const finishedAfterLastGuest = checkClosingComplete();
    result.closingWaitsForRemainingGuests = waitsForLastGuest
      && finishedAfterLastGuest
      && !State.running
      && !State.closing;
    const managementPanelRect = $(".management-panel").getBoundingClientRect();
    result.settlementOverlayAppears = !$("#settlementOverlay").classList.contains("hidden")
      && !State.running
      && State.lastSettlement?.completedDay === 1
      && $("#settlementResult").textContent === "오늘도 수고했어요";
    result.settlementSummaryAccurate = $("#summaryGoal").textContent === money(expectedCumulativeSales)
      && $("#summarySales").textContent === money(State.lastSettlement.sales)
      && $("#summaryServed").textContent === "3건 · 포장 0건"
      && $("#summaryMissed").textContent === "1명 · 포장 0건"
      && $("#summaryWaste").textContent === "2개"
      && $("#summaryRating").textContent === "최고예요";
    result.rewardBreakdownAccurate = State.lastSettlement.serviceBonus === expectedServiceBonus
      && State.lastSettlement.takeoutPenalty === 0
      && State.lastSettlement.totalReward === expectedReward
      && Progress.gold === expectedReward
      && $("#rewardTotal").textContent === `+${money(expectedReward)}`;
    result.dayAndGrowthProgress = Progress.day === 2
      && Progress.stats.completedDays === 1
      && Progress.stats.successfulDays === 1
      && Progress.stats.totalSales === State.sales
      && Progress.stallLevel === 1;
    result.managementPanelFitsLandscape = managementPanelRect.left >= stage.left
      && managementPanelRect.right <= stage.right
      && managementPanelRect.top >= stage.top
      && managementPanelRect.bottom <= stage.bottom
      && $$(".upgrade-card").length === 4;
    $("#closeSettlementButton").click();
    result.settlementCloseAndHudRestart = $("#settlementOverlay").classList.contains("hidden")
      && !$("#startButton").disabled
      && $("#startButton strong").textContent.trim() === "영업 시작";
    renderSettlement();

    Progress.gold = 1000000;
    renderHud();
    renderUpgradeShop();
    const goldBeforeUpgrade = Progress.gold;
    const potUpgradeCost = StationUpgradeCatalog.pot.costs[0];
    const stallButtonInitiallyDisabled = $("[data-stall-upgrade]").disabled;
    $("[data-station-upgrade='pot']").click();
    result.upgradePurchase = Progress.stationLevels.pot === 2
      && Progress.gold === goldBeforeUpgrade - potUpgradeCost
      && effectiveCookMs(RecipeCatalog.ramen_plain) === Math.round(RecipeCatalog.ramen_plain.cookMs * .92)
      && $("[data-upgrade-card='pot'] .upgrade-level").textContent === "LV.2/5";
    const grillCookBeforeUpgrade = effectiveCookMs(RecipeCatalog.grilled_dumpling);
    const odenCookBeforeUpgrade = effectiveCookMs(RecipeCatalog.warm_oden);
    $("[data-station-upgrade='grill']").click();
    $("[data-station-upgrade='oden']").click();
    result.allUpgradeEffectsApply = Progress.stationLevels.grill === 2
      && Progress.stationLevels.oden === 2
      && effectiveCookMs(RecipeCatalog.grilled_dumpling) < grillCookBeforeUpgrade
      && effectiveCookMs(RecipeCatalog.warm_oden) < odenCookBeforeUpgrade
      && effectiveBurnMs(RecipeCatalog.grilled_dumpling) === 0
      && StationUpgradeCatalog.oden.priceBonus[4] === .15;
    result.stallUpgradeRequiresStations = stallButtonInitiallyDisabled
      && stationRequirementMet(2)
      && !$("[data-stall-upgrade]").disabled
      && $("[data-upgrade-card='stall']").textContent.includes("냄비 3개")
      && $("[data-upgrade-card='stall']").textContent.includes("포장 주문 1건");
    const goldBeforeStallUpgrade = Progress.gold;
    const stallUpgradeCost = StallUpgradeCatalog.costs[0];
    $("[data-stall-upgrade]").click();
    result.paidStallUpgrade = Progress.stallLevel === 2
      && Progress.gold === goldBeforeStallUpgrade - stallUpgradeCost
      && $$(".appliance.pot:not([hidden])").length === 3
      && $$(".appliance.grill:not([hidden])").length === 1
      && $$(".appliance.oden:not([hidden])").length === 1;
    const savedProgress = JSON.parse(localStorage.getItem(SaveKey) || "null");
    result.progressSavedLocally = savedProgress?.day === 2
      && savedProgress?.gold === Progress.gold
      && savedProgress?.stationLevels?.pot === 2
      && savedProgress?.stationLevels?.grill === 2
      && savedProgress?.stationLevels?.oden === 2
      && savedProgress?.stallLevel === 2
      && savedProgress?.version === 10
      && savedProgress?.stats?.completedDays === 1
      && savedProgress?.regulars?.[qaFirstCustomerId]?.served === 1
      && savedProgress?.storyLog?.length >= 1;
    const dayBeforeResetArm = Progress.day;
    $("#resetProgressButton").click();
    result.resetRequiresConfirmation = Progress.day === dayBeforeResetArm
      && $("#resetProgressButton").classList.contains("armed")
      && $("#resetProgressButton").textContent.includes("한 번 더");
    disarmResetButton();

    if (qaParams.has("holdSettlement")) {
      result.nextDayProgression = Progress.day === 2 && !$("#settlementOverlay").classList.contains("hidden");
    } else {
      $("#nextDayButton").click();
      result.nextDayProgression = State.running
        && Progress.day === 2
        && State.sales === 0
        && $("#dayNumber").textContent === "2"
        && $("#goalAmount").textContent === money(Progress.stats.totalSales)
        && $("#settlementOverlay").classList.contains("hidden");
    }

    const dayBeforeExpansionQA = Progress.day;
    const levelBeforeExpansionQA = Progress.stallLevel;
    const stationLevelsBeforeExpansionQA = { ...Progress.stationLevels };
    const runningBeforeExpansionQA = State.running;
    const milestoneCases = [
      { day: 1, level: 1, seats: 3, customers: 3, width: 1920 },
      { day: 10, level: 1, seats: 4, customers: 6, width: 1920 },
      { day: 25, level: 1, seats: 5, customers: 8, width: 1920 },
      { day: 50, level: 2, seats: 6, customers: 10, width: 2160 },
      { day: 1, level: 3, seats: 7, customers: 12, width: 2340 },
      { day: 1, level: 4, seats: 8, customers: 15, width: 2340 },
      { day: 1, level: 5, seats: 10, customers: 18, width: 2340 }
    ];
    let milestoneLayoutPass = true;
    let dynamicBoreumiTargetsPass = true;
    milestoneCases.forEach(testCase => {
      Progress.day = testCase.day;
      Progress.stallLevel = testCase.level;
      applyStallLevel();
      milestoneLayoutPass = milestoneLayoutPass
        && guestCapacityForLevel() === testCase.seats
        && customerPoolSize() === testCase.customers
        && $$(".guest-slot:not([hidden])").length === testCase.seats
        && Number($("#stage").dataset.layoutWidth) === testCase.width
        && Config.stage.currentWidth >= testCase.width;
      const visibleStation = $$(".appliance:not([hidden])").at(-1);
      const visibleGuest = $$(".guest-slot:not([hidden])").at(-1);
      const laneBox = stageBoxFor($(".characters"));
      const stationBox = stageBoxFor(visibleStation);
      const guestBox = stageBoxFor(visibleGuest);
      const stationExpected = stationBox.left + stationBox.width / 2 - laneBox.left - Config.boreumi.cookingWidth / 2;
      const guestExpected = guestBox.left + guestBox.width / 2 - laneBox.left - Config.boreumi.servingWidth / 2;
      dynamicBoreumiTargetsPass = dynamicBoreumiTargetsPass
        && Math.abs(laneLeftFor(visibleStation, Config.boreumi.cookingWidth) - stationExpected) < .5
        && Math.abs(laneLeftFor(visibleGuest, Config.boreumi.servingWidth) - guestExpected) < .5;
    });
    result.seatAndCustomerMilestones = milestoneLayoutPass;
    result.dynamicBoreumiTargets = dynamicBoreumiTargetsPass;
    Progress.day = 1;
    Progress.stallLevel = 1;
    applyStallLevel();
    const level1StationCount = $$(".appliance:not([hidden])").length;
    Progress.stallLevel = 2;
    applyStallLevel();
    const level2StationCount = $$(".appliance:not([hidden])").length;
    Progress.stallLevel = 3;
    applyStallLevel();
    const level3StationCount = $$(".appliance:not([hidden])").length;
    result.stationUnlockSequence = level1StationCount === 4 && level2StationCount === 5 && level3StationCount === 6;
    const facilityCases = [
      { level: 1, takeout: 0, pass: 0 },
      { level: 2, takeout: 1, pass: 0 },
      { level: 3, takeout: 1, pass: 2 },
      { level: 4, takeout: 2, pass: 3 },
      { level: 5, takeout: 3, pass: 4 }
    ];
    result.takeoutAndPassUnlockSequence = facilityCases.every(testCase => {
      Progress.stallLevel = testCase.level;
      applyStallLevel();
      return takeoutCapacityForLevel() === testCase.takeout
        && completionPassCapacityForLevel() === testCase.pass
        && $$(".takeout-order:not([hidden])").length === testCase.takeout
        && $$(".pass-slot:not([hidden])").length === testCase.pass
        && $("#takeoutBoard").hidden === (testCase.takeout === 0)
        && $("#completionPass").hidden === (testCase.pass === 0);
    });
    Progress.day = 1;
    Progress.stallLevel = 5;
    applyStallLevel();
    clearGuestTimers();
    resetGuests();
    State.running = true;
    for (let index = 0; index < 10; index += 1) activateGuest(index);
    const maxSeatCustomerIds = Guests.filter(guest => guest.active).map(guest => guest.customerId);
    result.tenSeatRandomVisitors = maxSeatCustomerIds.length === 10
      && new Set(maxSeatCustomerIds).size === 10
      && maxSeatCustomerIds.every(id => unlockedCustomers().some(customer => customer.id === id));
    const maxSeatRects = $$(".guest-slot:not([hidden])").map(slot => slot.getBoundingClientRect());
    result.tenSeatLayoutNoOverlap = maxSeatRects.length === 10
      && maxSeatRects.every((rect, index) => index === 0 || rect.left >= maxSeatRects[index - 1].right - 1);
    const customerArtLoaded = await Promise.all(CustomerCatalog.map(customer => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth >= 200 && image.naturalHeight >= 300);
      image.onerror = () => resolve(false);
      image.src = customer.art;
    })));
    result.eighteenCustomerArt = customerArtLoaded.every(Boolean);
    clearGuestTimers();
    resetGuests();

    const facilityArtLoaded = await Promise.all(["assets/art-v012/takeout-package-v1.webp", "assets/art-v012/completion-pass-vertical-v1.webp"].map(source => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth >= 900 && image.naturalHeight >= 600);
      image.onerror = () => resolve(false);
      image.src = source;
    })));
    result.takeoutFacilityArtLoaded = facilityArtLoaded.every(Boolean)
      && getComputedStyle($(".takeout-order .package-preview")).backgroundImage.includes("takeout-package-v1.webp")
      && getComputedStyle($("#completionPass")).backgroundImage.includes("completion-pass-vertical-v1.webp");

    const boardRect = $("#takeoutBoard").getBoundingClientRect();
    const maxGuestRowRect = $("#guestRow").getBoundingClientRect();
    const passRect = $("#completionPass").getBoundingClientRect();
    const maxKitchenRect = $("#cookRight").getBoundingClientRect();
    const maxDockRect = $(".dock").getBoundingClientRect();
    result.expansionFacilitiesUseSideWing = boardRect.right <= maxGuestRowRect.left + 2
      && passRect.left >= maxKitchenRect.right - 3
      && passRect.top < maxDockRect.top
      && boardRect.left >= $("#stage").getBoundingClientRect().left - 1;

    resetTakeoutOrders();
    const salesBeforeTakeoutQA = State.sales;
    const servedBeforeTakeoutQA = State.served;
    activateTakeout(0);
    const generatedLevel5Combination = TakeoutOrders[0].items.length === 2
      && MenuCatalog[TakeoutOrders[0].items[0].id].kind === "food"
      && MenuCatalog[TakeoutOrders[0].items[1].id].kind === "drink";
    TakeoutOrders[0].items = [{ id: "ramen_plain", fulfilled: false }];
    renderTakeoutOrder(TakeoutOrders[0]);
    Appliances[0].state = "ready";
    Appliances[0].item = "noodle";
    Appliances[0].ingredients = ["noodle"];
    Appliances[0].recipeId = "ramen_plain";
    Appliances[0].cookRemaining = 0;
    Appliances[0].burnRemaining = effectiveBurnMs(RecipeCatalog.ramen_plain);
    renderAppliance(Appliances[0]);
    const expectedTakeoutPrice = Math.round(menuPriceWithUpgrade("ramen_plain") * (1 + Config.takeout.bonusByLevel[5]));
    deliverTakeoutItem(0, "ramen_plain", Appliances[0]);
    result.randomTakeoutOrders = generatedLevel5Combination;
    result.takeoutPackingFlow = TakeoutOrders[0].packed
      && !TakeoutOrders[0].active
      && Appliances[0].state === "empty"
      && State.takeoutServed === 1
      && State.served === servedBeforeTakeoutQA + 1
      && State.sales === salesBeforeTakeoutQA + expectedTakeoutPrice;

    Appliances[3].state = "ready";
    Appliances[3].item = "dumpling";
    Appliances[3].ingredients = ["dumpling"];
    Appliances[3].recipeId = "grilled_dumpling";
    Appliances[3].cookRemaining = 0;
    Appliances[3].burnRemaining = effectiveBurnMs(RecipeCatalog.grilled_dumpling);
    renderAppliance(Appliances[3]);
    storeFoodInPass(Appliances[3], 0);
    result.completionPassStoresFood = Appliances[3].state === "empty"
      && CompletionPassSlots[0].recipeId === "grilled_dumpling"
      && $(`[data-pass-slot="0"] img`)?.src.includes("food-dumpling-v2.webp");
    Guests[0].active = true;
    Guests[0].serving = false;
    Guests[0].customerId = "office";
    Guests[0].order = createOrder("grilled_dumpling", "soju");
    Guests[0].maxPatience = effectivePatienceMs();
    Guests[0].patience = Guests[0].maxPatience;
    Guests[0].satisfaction = "waiting";
    renderGuest(Guests[0]);
    servePassFood(0, 0);
    result.completionPassServesHall = CompletionPassSlots[0].recipeId === null
      && Guests[0].order.items[0].fulfilled
      && !Guests[0].order.items[1].fulfilled;
    resetGuests();

    const penaltyBeforeQA = State.takeoutPenalty;
    const missedTakeoutBeforeQA = State.takeoutMissed;
    activateTakeout(1);
    TakeoutOrders[1].items = [{ id: "warm_oden", fulfilled: false }];
    expireTakeout(TakeoutOrders[1]);
    result.missedTakeoutHasPenalty = State.takeoutMissed === missedTakeoutBeforeQA + 1
      && State.takeoutPenalty === penaltyBeforeQA + Config.takeout.missedPenalty
      && TakeoutOrders[1].missed
      && !TakeoutOrders[1].active;
    clearTakeoutTimers();
    resetTakeoutOrders();
    resetCompletionPass();
    Progress.day = dayBeforeExpansionQA;
    Progress.stallLevel = levelBeforeExpansionQA;
    Progress.stationLevels = stationLevelsBeforeExpansionQA;
    State.running = runningBeforeExpansionQA;
    applyStallLevel();
    renderHud();

    const dayBeforeInfiniteQA = Progress.day;
    Progress.day = 123456;
    renderHud();
    result.infiniteDayCounter = $("#dayNumber").textContent === "123456"
      && $("#stage").dataset.dayDigits === "6"
      && sanitizeProgress({ day: 123456 }).day === 123456;
    result.infiniteDifficultyStaysPlayable = Config.guests.waitsForever
      && !Config.cooking.burns
      && Progress.stats.totalSales >= 0;
    Progress.day = dayBeforeInfiniteQA;
    renderHud();

    const output = document.createElement("pre");
    output.id = "qa-results";
    output.textContent = JSON.stringify(result, null, 2);
    output.style.cssText = "position:absolute;z-index:99999;left:0;top:0;width:360px;margin:0;padding:8px;background:white;color:black;font-size:11px;line-height:1.25;white-space:pre-wrap";
    if (!qaParams.has("silent")) $("#stage").append(output);
    window.BoreumiQAStep = "complete";
    window.BoreumiQAResults = result;
    const qaFailures = Object.entries(result).filter(([, passed]) => !passed).map(([name]) => name);
    document.documentElement.dataset.qaFailures = qaFailures.join(",");
    document.documentElement.dataset.qaCount = String(Object.keys(result).length);
    document.documentElement.dataset.qa = qaFailures.length ? "fail" : "pass";
  }

  build();
  Sound.syncButton();
  State.cookingTimer = setInterval(tickCooking, Config.cooking.tickMs);
  State.patienceTimer = setInterval(tickGuests, Config.guests.tickMs);
  $$(".ingredient,.appliance").forEach(bindDrag);
  document.addEventListener("pointermove", moveDrag, { passive: false });
  document.addEventListener("pointerup", endDrag, { passive: false });
  document.addEventListener("pointercancel", endDrag, { passive: false });
  $("#startButton").addEventListener("click", start);
  $("#nextDayButton").addEventListener("click", nextDay);
  $("#closeSettlementButton").addEventListener("click", closeSettlement);
  $("#restockButton").addEventListener("click", restockIngredients);
  $("#openSupplyShopButton").addEventListener("click", openSupplyShop);
  $("#quickSupplyButton").addEventListener("click", openSupplyShop);
  $("#closeSupplyShopButton").addEventListener("click", closeSupplyShop);
  $("#supplyShopRestockAll").addEventListener("click", restockIngredients);
  $("#recipeButton").addEventListener("click", openRecipeBook);
  $("#closeRecipeButton").addEventListener("click", () => closeRecipeBook(true));
  $("#closeMenuUnlockButton").addEventListener("click", showNextMenuUnlock);
  $("#resetProgressButton").addEventListener("click", resetProgress);
  $("#pauseButton").addEventListener("click", () => {
    if (!State.running) return toast("영업 중에 사용할 수 있어요.");
    State.paused = true;
    Sound.stopBgm();
    Sound.sfx("drop");
    $("#stage").classList.add("paused-fx");
    $("#pauseOverlay").classList.remove("hidden");
  });
  $("#resumeButton").addEventListener("click", () => {
    State.paused = false;
    $("#stage").classList.remove("paused-fx");
    Sound.startBgm();
    Sound.sfx("drop");
    $("#pauseOverlay").classList.add("hidden");
  });
  $("#soundButton").addEventListener("click", () => Sound.setEnabled(!Sound.enabled));
  $("#helpButton").addEventListener("click", openHelp);
  $("#journalButton").addEventListener("click", openJournal);
  $("#closeStoryWhisperButton").addEventListener("click", dismissGuestDialogue);
  $("#settlementJournalButton").addEventListener("click", openJournal);
  $("#closeJournalButton").addEventListener("click", () => closeJournal(true));
  $("#journalAllButton").addEventListener("click", () => {
    State.journalCustomerId = null;
    renderJournal();
    Sound.sfx("drop");
  });
  $("#closeHelpButton").addEventListener("click", () => closeHelp(true));
  $("#checkUpdateButton").addEventListener("click", async () => {
    const button = $("#checkUpdateButton");
    button.disabled = true;
    button.textContent = "확인 중...";
    const available = await window.BoreumiPWA?.checkForUpdate?.();
    if (!available) toast("현재 최신 버전을 사용하고 있어요.");
    button.disabled = false;
    button.textContent = "업데이트 확인";
    updateMobileCare();
  });
  $("#exportSaveButton").addEventListener("click", exportProgressFile);
  $("#importSaveButton").addEventListener("click", () => $("#importSaveInput").click());
  $("#importSaveInput").addEventListener("change", event => importProgressFile(event.target.files?.[0]));
  $("#restartTutorialButton").addEventListener("click", () => {
    if (State.running && !State.tutorialMode) {
      closeHelp(true);
      toast("현재 영업을 마친 뒤 연습 포차를 이용해 주세요.");
      return;
    }
    closeHelp(false);
    Tutorial.start();
  });
  $("#tutorialSkipButton").addEventListener("click", () => {
    Tutorial.close(true);
    toast("단계별 안내를 건너뛰었어요. ? 버튼에서 다시 볼 수 있어요.");
  });
  $("#tutorialActionButton").addEventListener("click", () => Tutorial.advance());
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!$("#supplyShopOverlay").classList.contains("hidden")) closeSupplyShop();
    else if (!$("#recipeOverlay").classList.contains("hidden")) closeRecipeBook(true);
    else if (!$("#journalOverlay").classList.contains("hidden")) closeJournal(true);
    else if (!$("#helpOverlay").classList.contains("hidden")) closeHelp(true);
    else if (!$("#settlementOverlay").classList.contains("hidden")) closeSettlement();
  });
  document.addEventListener("dragstart", event => event.preventDefault());
  window.addEventListener("boreumi:cache-progress", updateMobileCare);
  window.addEventListener("boreumi:storage", updateMobileCare);
  window.addEventListener("boreumi:update-ready", () => toast("새 버전이 준비됐어요. 위쪽 알림에서 적용할 수 있어요."));
  window.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("resize", resize, { passive: true });
  window.addEventListener("boreumi:viewport", resize, { passive: true });
  resize();
  updateMobileCare();
  startPpomiPoses();
  initDevTools();
  window.BoreumiBoot?.markGameReady();
  Tutorial.scheduleFirstRun();
  browserQA().catch(error => {
    console.error("Boreumi QA failed", error);
    document.documentElement.dataset.qa = "error";
    window.BoreumiQAError = String(error?.stack || error);
    const qaError = document.createElement("pre");
    qaError.id = "qa-error";
    qaError.textContent = window.BoreumiQAError;
    qaError.style.cssText = "position:absolute;z-index:99999;left:0;top:0;max-width:720px;margin:0;padding:12px;background:#fff;color:#900;font-size:13px;white-space:pre-wrap";
    $("#stage").append(qaError);
  });
})();
