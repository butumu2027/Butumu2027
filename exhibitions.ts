export type WorkImage = { src: string; alt: string; caption?: string };
export type Exhibit = { id: string; slug: string; name: string; roomId: string; order: number; number: string; summary?: string; mechanism?: string; points?: string; images: WorkImage[]; youtubeId?: string };
export const site = { name: "物理部無線班", english: "PHYSICS & RADIO CLUB", heroImage: "/images/architecture.svg", heroAlt: "曲線と光の重なりを表現した抽象的な建築ビジュアル" };
export const rooms = [
 { id: "room-01", name: "○○○号室", label: "ROOM 01", image: "/images/room-01.svg", alt: "白い曲線が重なる展示室の抽象ビジュアル" },
 { id: "room-02", name: "×××号室", label: "ROOM 02", image: "/images/room-02.svg", alt: "光と格子が交差する展示室の抽象ビジュアル" },
];
// roomId と order で所属と表示順を編集。画像が未登録の場合は共通の抽象プレースホルダーを表示します。
export const exhibits: Exhibit[] = [
 { id: "work-01", slug: "automatic-bin", number: "01", name: "テスラコイル", roomId: "room-01", order: 1, images: [] },
 { id: "work-02", slug: "transformer", number: "02", name: "LEDキューブ", roomId: "room-01", order: 2, images: [] },
 { id: "work-03", slug: "automatic-guitar", number: "03", name: "住宅模型", roomId: "room-01", order: 3, images: [] },
 { id: "work-04", slug: "lion-robot", number: "04", name: "ホログラム", roomId: "room-01", order: 4, images: [] },
 { id: "work-05", slug: "pipe-organ", number: "05", name: "4脚歩行ロボット", roomId: "room-01", order: 5, images: [] },
 { id: "work-06", slug: "house-model", number: "06", name: "パイプオルガン", roomId: "room-01", order: 6, images: [] },
 { id: "work-07", slug: "air-hockey", number: "07", name: "コイルガン", roomId: "room-01", order: 7, images: [] },
 { id: "work-08", slug: "car-racing", number: "08", name: "電子工作体験", roomId: "room-01", order: 8, images: [] },
 { id: "work-09", slug: "magic-wand-1", number: "09", name: "ゴミ箱ロボット", roomId: "room-02", order: 1, images: [] },
 { id: "work-10", slug: "magic-wand-2", number: "10", name: "魔法の杖", roomId: "room-02", order: 2, images: [] },
 { id: "work-11", slug: "junior-games", number: "11", name: "カーレース", roomId: "room-02", order: 3, images: [] },
 { id: "work-12", slug: "coilgun", number: "12", name: "イライラ棒", roomId: "room-02", order: 4, images: [] },
 { id: "work-13", slug: "tesla-coil", number: "13", name: "中１ゲー", roomId: "room-02", order: 5, images: [] },
 { id: "work-14", slug: "electronics-workshop", number: "14", name: "エアホッケー", roomId: "room-02", order: 6, images: [] },
 { id: "work-15", slug: "automatic-guitar", number: "15", name: "自動演奏ギター", roomId: "room-02", order: 7, images: []},
];
export const worksInRoom = (roomId: string) => exhibits.filter(w => w.roomId === roomId).sort((a,b) => a.order-b.order);
export const imagesFor = (work: Exhibit): WorkImage[] => work.images.length ? work.images : [{ src: `/images/placeholder-${Number(work.number)%3}.svg`, alt: `${work.name}の写真準備中を示す抽象ビジュアル`, caption: "作品写真準備中 / ABSTRACT PLACEHOLDER" }];
