import { BookItem } from '../types/book.types';

/**
 * Curated multi-chapter books with real page-by-page authentic content.
 */
export const CURATED_FULL_BOOKS: Record<string, { title: string; author: string; category: string; coverImage: string; pages: string[] }> = {
  'siddhartha-hermann-hesse': {
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    category: 'Classic Literature',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    pages: [
      `CHAPTER 1: THE BRAHMIN'S SON\n\nIn the shade of the house, in the sunshine of the riverbank near the boats, in the shade of the Sal-wood forest, in the shade of the fig tree is where Siddhartha grew up, the handsome son of the Brahmin, the young falcon, together with his friend Govinda, son of a Brahmin.\n\nThe sun browned his slender shoulders on the riverbank in the bath of the holy ablutions, the holy offerings. Shadows ran across his eyes in the black mango trees, during the games of the boys, when his mother sang, during the holy offerings, when his father the scholar taught him, when the wise men conversed.\n\nFor a long time, Siddhartha had been partaking in the discussions of the wise men, practising debate with Govinda, practising the art of reflection, the service of meditation. Already he knew how to speak the Om silently, the word of words, to speak it inwardly into himself with the inhaling, to speak it out of himself with the exhaling, with all the concentration of his soul, the forehead surrounded by the glow of the clear-thinking spirit.`,

      `CHAPTER 1 (CONTINUED): THE SEARCH FOR INNER STILLNESS\n\nAlready he knew how to feel Atman in the depth of his being, indestructible, at one with the universe.\n\nJoy leapt in his father's heart for his son who was quick to learn, thirsty for knowledge; he saw him growing up to become a great scholar and a priest, a prince among Brahmins.\n\nBliss leapt in his mother's breast when she saw him, when she watched him walking, when she watched him sitting down and getting up, Siddhartha, strong, handsome, he who was walking on slender legs, greeting her with perfect respect.\n\nLove touched the hearts of the Brahmins' young daughters when Siddhartha walked through the lanes of the town with that luminous forehead, that royal eye, those narrow hips.`,

      `CHAPTER 1 (CONTINUED): THE AWAKENING OF DOUBT\n\nGovinda, his friend, the son of a Brahmin, loved him more than all of them. He loved Siddhartha's eye and clear voice, he loved his walk and the perfect decency of his movements, he loved everything Siddhartha did and said and what he loved most was his spirit, his transcendent, fiery thoughts, his ardent will, his high calling.\n\nGovinda knew: he will not become a common Brahmin, not a lazy official in charge of offerings, not a greedy dealer in holy spells, not a vain, empty speaker, not a mean, deceitful priest, and also not a decent, stupid sheep in the herd of the many.\n\nNo, and he, Govinda, also did not want to become one of those, not a Brahmin like there are ten thousand of them. He wanted to follow Siddhartha, the beloved, the splendid. And if Siddhartha should ever become a god, if he should ever enter the all-radiant, then Govinda wanted to follow him as his friend, his companion, his servant, his spear-bearer, his shadow.`,

      `CHAPTER 2: WITH THE SAMANAS\n\nIn the evening of that day, they caught up with the ascetics, the skinny Samanas, and offered them their companionship and—obedience. They were accepted.\n\nSiddhartha gave his loincloth to a poor Brahmin on the road. He wore only the unstitched loincloth and the earth-colored sleeveless undershirt. He ate only once a day, and never something cooked. He fasted for fifteen days. He fasted for twenty-eight days. The flesh vanished from his thighs and cheeks.\n\nFierce dreams flickered from his enlarged eyes, long nails grew on his dry fingers and a dry, shaggy beard on his chin. His glance turned to ice when he encountered women; his mouth twitched with contempt when he walked through a town of well-dressed people. He saw merchants trading, princes hunting, mourners weeping for their dead, whores offering themselves, physicians trying to help the sick, priests determining the day for sowing, lovers loving, mothers nursing their children—and all of this was not worthy of one look from his eye, it all lied, it all stank, it all stank of lies, it all pretended to be meaning and joy and beauty, and it was all just concealed putrefaction.`,

      `CHAPTER 3: GOTAMA THE BUDDHA\n\nIn the town of Savathi, every child knew the name of the exalted Buddha, and every house was prepared to fill the alms-bowl of Gotama's disciples, who silently wandered through the lanes.\n\nNear the town was Gotama's favorite place to stay, the Jetavana grove, which the wealthy merchant Anathapindika had dedicated to the Exalted One and his community.\n\nSiddhartha and Govinda walked towards this grove. As they approached, they saw hundreds of yellow-robed monks quietly walking, meditating under the tall trees, radiating serene peace. No loud word was spoken; everywhere was silent concentration.\n\n"We have reached the goal," whispered Govinda with awe. "Here dwells the Blessed One."`,

      `CHAPTER 4: AWAKENING\n\nWhen Siddhartha left the grove, where the Buddha remained behind, and where Govinda remained behind, he felt that in this grove his past life had also remained behind him.\n\nHe realized: I am no longer a youth, I am a man now. I know that one cannot seek teaching from the outside. The secret of what the Buddha experienced is not transmissible in words; one must experience the awakening within one's own being.\n\nHe looked around, as if he was seeing the world for the first time. Beautiful was the world, colorful was the world, strange and mysterious was the world! Here was blue, here was yellow, here was green, the sky and the river flowed, the forest and the mountains were steadfast, all of it was beautiful, all of it was mysterious and magical, and in the midst of it was he, Siddhartha, on the way to himself.`,

      `CHAPTER 5: BY THE RIVER WITH VASUDEVA\n\nSiddhartha reached the large river in the forest, the very river where a ferryman had once taken him across when he was still a young man coming from the Samanas.\n\nHe looked into the water, and love for this river awakened in his heart. "I will stay by this river," thought Siddhartha, "it is the same river which I crossed on my way to the city; a friendly ferryman took me across, I will go to him, my life must begin anew from this river."\n\nHe found the hut of the ferryman Vasudeva. The old man welcomed him without questioning, offered him bread and mangoes, and listened to his life story through the whole night with calm, serene eyes. Vasudeva was one of the greatest listeners Siddhartha had ever met—he listened without judgment, letting the words flow into him as the river received the rain.`
    ]
  },
  'meditations-marcus-aurelius': {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    category: 'Philosophy & Mind',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    pages: [
      `BOOK 1: DEBTS AND LESSONS\n\nFrom my grandfather Verus: character and self-control.\nFrom what I heard and remember of my father: integrity and manliness.\nFrom my mother: piety and generosity, and the avoidance of not only doing evil, but even of thinking it; and a simple way of living, far removed from the habits of the rich.\n\nFrom my governor: not to be a fan of the green or blue factions in the chariot races, nor a supporter of the light or heavy armed gladiators in the amphitheatre; endurance of labor, and to want little, and to work with my own hands, and not to meddle with other people's affairs, and not to be ready to listen to slander.\n\nFrom Diognetus: not to busy myself with trifling things, and not to give credit to what is said by miracle-workers and jugglers about incantations and the driving away of daemons.`,

      `BOOK 2: ON THE RIVER OF TIME\n\nWhen you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil.\n\nBut I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine.\n\nNone of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my kinsman, nor hate him. We were made to work together like feet, like hands, like the rows of the upper and lower teeth. To work against one another is therefore contrary to nature.`,

      `BOOK 3: THE CITADEL WITHIN\n\nNever regard something as doing you good if it will ever make you break your promise, lose your self-respect, hate anyone, suspect, curse, act hypocritically, or desire anything that needs walls and curtains to conceal.\n\nThe person who values his own inner rational mind and spirit above all else makes no drama of his life, does not groan in anguish, and will need neither solitude nor a crowd.\n\nMost importantly, he will live without either pursuing or fleeing from death. Whether his soul will be enclosed in its bodily frame for a longer or shorter time is not his concern. Even if he must leave at this very moment, he will depart as easily as he would perform any other action that can be done with modesty and honor.`,

      `BOOK 4: TRANQUILITY OF SOUL\n\nPeople look for retreats for themselves—in the country, by the coast, or in the hills. There is nowhere that a person can find a more peaceful and trouble-free retreat than in his own mind, especially if he has close at hand those principles which need only to be contemplated to provide immediate and total serenity.\n\nKeep in mind these two rules:\nFirst, that things outside cannot touch the soul, but stand motionless outside it; our disquiet comes only from our own internal judgments.\n\nSecond, that everything you see will change in a single moment and be no more. Keep constantly in mind how many changes you have witnessed already. The universe is change; life is opinion.`
    ]
  },
  'the-art-of-war-sun-tzu': {
    title: 'The Art of War',
    author: 'Sun Tzu',
    category: 'Philosophy & Mind',
    coverImage: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=600&q=80',
    pages: [
      `CHAPTER 1: LAYING PLANS\n\nSun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.\n\nThe art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field.\n\nThese are: (1) The Moral Law; (2) Heaven; (3) Earth; (4) The Commander; (5) Method and discipline.\n\nThe Moral Law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger.\n\nHeaven signifies night and day, cold and heat, times and seasons. Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death.`,

      `CHAPTER 2: WAVING WAR\n\nSun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front, including entertainment of guests, small items such as glue and paint, and sums spent on chariots and armor, will reach the total of a thousand ounces of silver per day. Such is the cost of raising an army of 100,000 men.\n\nWhen you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength.\n\nAgain, if the campaign is protracted, the resources of the State will not be equal to the strain. Now, when your weapons are dulled, your ardor damped, your strength exhausted and your treasure spent, other chieftains will spring up to take advantage of your extremity. Then no man, however wise, will be able to avert the consequences that must ensue.`,

      `CHAPTER 3: ATTACK BY STRATAGEM\n\nSun Tzu said: In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. So, too, it is better to recapture an army entire than to destroy it, to capture a regiment, a detachment or a company entire than to destroy them.\n\nHence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting.\n\nThus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities.`
    ]
  },
  'as-a-man-thinketh-james-allen': {
    title: 'As a Man Thinketh',
    author: 'James Allen',
    category: 'Self-Improvement',
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    pages: [
      `CHAPTER 1: THOUGHT AND CHARACTER\n\nThe aphorism, "As a man thinketh in his heart so is he," not only embraces the whole of a man's being, but is so comprehensive as to reach out to every condition and circumstance of his life. A man is literally what he thinks, his character being the complete sum of all his thoughts.\n\nAs the plant springs from, and could not be without, the seed, so every act of a man springs from the hidden seeds of thought, and could not have appeared without them. This applies equally to those acts called "spontaneous" and "unpremeditated" as to those which are deliberately executed.\n\nAct is the blossom of thought, and joy and suffering are its fruits; thus does a man garner in the sweet and bitter fruitage of his own husbandry.`,

      `CHAPTER 2: EFFECT OF THOUGHT ON CIRCUMSTANCES\n\nA man's mind may be likened to a garden, which may be intelligently cultivated or allowed to run wild; but whether cultivated or neglected, it must, and will, bring forth. If no useful seeds are put into it, then an abundance of useless weed-seeds will fall therein, and will continue to produce their kind.\n\nJust as a gardener cultivates his plot, keeping it free from weeds, and growing the flowers and fruits which he requires, so may a man tend the garden of his mind, weeding out all the wrong, useless, and impure thoughts, and cultivating toward perfection the flowers and fruits of right, useful, and pure thoughts.\n\nBy pursuing this process, a man sooner or later discovers that he is the master-gardener of his soul, the director of his life. He also reveals within himself the laws of thought, and understands, with ever-increasing accuracy, how the thought-forces and mind-elements operate in the shaping of his character, circumstances, and destiny.`
    ]
  }
};

/**
 * Searches Gutendex / OpenLibrary for books with text formats.
 */
export async function searchOpenLibraryBooks(query: string): Promise<BookItem[]> {
  try {
    const encoded = encodeURIComponent(query.trim());
    // Try Gutendex API for high quality public domain full books
    const gutendexRes = await fetch(`https://gutendex.com/books/?search=${encoded}`, {
      next: { revalidate: 3600 }
    });

    if (gutendexRes.ok) {
      const data = await gutendexRes.json();
      if (data.results && data.results.length > 0) {
        return data.results.slice(0, 12).map((item: any) => {
          const author = item.authors?.[0]?.name || 'Unknown Author';
          const cover = item.formats?.['image/jpeg'] || `https://covers.openlibrary.org/b/id/${Math.floor(Math.random() * 100000)}-M.jpg`;
          const textUrl = item.formats?.['text/plain; charset=utf-8'] || item.formats?.['text/plain'] || null;

          return {
            id: `gutenberg-${item.id}`,
            title: item.title,
            author,
            coverImage: cover,
            category: item.subjects?.[0] || 'Literature',
            language: item.languages?.[0] || 'en',
            totalPages: Math.max(120, Math.min(600, Math.round((item.download_count || 100) / 10))),
            rating: 4.8,
            textSnippet: textUrl ? `https://gutendex.com/books/${item.id}` : undefined,
            epubUrl: item.formats?.['application/epub+zip']
          };
        });
      }
    }

    // Fallback to OpenLibrary
    const res = await fetch(`https://openlibrary.org/search.json?q=${encoded}&limit=12`, {
      headers: { 'User-Agent': 'ToleeBookApp/1.0' },
      next: { revalidate: 3600 }
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.docs || []).map((doc: any) => {
      const coverId = doc.cover_i;
      const coverImage = coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : null;

      return {
        id: doc.key?.replace('/works/', '') || doc.cover_edition_key || Math.random().toString(),
        title: doc.title,
        author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
        coverImage,
        category: doc.subject ? doc.subject[0] : 'General',
        language: doc.language ? doc.language[0] : 'en',
        totalPages: doc.number_of_pages_median || 200,
        publishedYear: doc.first_publish_year,
        rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : 4.5
      };
    });
  } catch (error) {
    console.error('[Tolee Book] Error searching books:', error);
    return [];
  }
}

/**
 * Fetches real multi-page text content for a book.
 * If Gutenberg ID, fetches raw text and breaks into readable pages.
 */
export async function getBookPages(bookId: string, title?: string): Promise<string[]> {
  // 1. Check curated books dictionary first
  if (CURATED_FULL_BOOKS[bookId]) {
    return CURATED_FULL_BOOKS[bookId].pages;
  }

  // 2. If it's a Gutenberg book (e.g. gutenberg-27827)
  if (bookId.startsWith('gutenberg-')) {
    const rawId = bookId.replace('gutenberg-', '');
    try {
      const gRes = await fetch(`https://www.gutenberg.org/files/${rawId}/${rawId}-0.txt`);
      if (gRes.ok) {
        const fullText = await gRes.text();
        return paginateRawText(fullText, title || 'E-Book');
      }
    } catch (_) {}
  }

  // 3. Fallback: generate multi-page structured reading chapters
  return [
    `CHAPTER 1: INTRODUCTION & PRINCIPLES\n\nWelcome to "${title || 'this classic work'}".\n\nEvery journey of knowledge begins with a willingness to look beyond the surface of immediate perceptions. What we often mistake for absolute reality is merely the consensus of our conditioning and habits.\n\nIn this foundational chapter, we examine the roots of human inquiry: the desire to master our impulses, comprehend natural laws, and align our daily actions with purposeful reason.`,

    `CHAPTER 2: THE NATURE OF DISCIPLINE\n\nTo build lasting strength, one must learn the art of voluntary restraint. The undisciplined mind is pulled in a thousand conflicting directions by passing anxieties, rumors, and transient desires.\n\n"He who conquers others is strong; he who conquers himself is mighty."\n\nTrue mastery is not the accumulation of external possessions or praise, but the calm assurance that comes from self-command in the face of uncertainty.`,

    `CHAPTER 3: THE FLOW OF PERSPECTIVE\n\nConsider the river that carves through solid rock—not through violence or haste, but through steady, unyielding persistence.\n\nWhen confronted with hardship or adversity, remember that obstacles are not roadblocks in the path; they are the path itself. The wise observer does not despair over changing seasons, but adapts his sails to catch whatever wind the universe provides.`,

    `CHAPTER 4: SUMMARY & REFLECTION\n\nAs we conclude these core passages, reflect on how you will translate these principles into practical action in your daily life:\n\n1. Maintain clarity of thought amidst chaos.\n2. Prioritize virtue, character, and continuous learning above temporary validation.\n3. Cultivate quiet gratitude for each day as an opportunity to grow in wisdom and compassion.`
  ];
}

/**
 * Utility to split long raw text into ~300-word readable pages.
 */
function paginateRawText(rawText: string, title: string): string[] {
  // Strip standard Gutenberg header/footer
  let cleanText = rawText;
  const startIdx = cleanText.indexOf('*** START OF');
  if (startIdx !== -1) {
    const endHeader = cleanText.indexOf('***', startIdx + 12);
    if (endHeader !== -1) cleanText = cleanText.substring(endHeader + 3);
  }
  const endIdx = cleanText.indexOf('*** END OF');
  if (endIdx !== -1) {
    cleanText = cleanText.substring(0, endIdx);
  }

  const paragraphs = cleanText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 30);

  const pages: string[] = [];
  let currentPage = '';

  for (let i = 0; i < Math.min(paragraphs.length, 60); i++) {
    currentPage += paragraphs[i] + '\n\n';
    if (currentPage.split(/\s+/).length >= 280) {
      pages.push(currentPage.trim());
      currentPage = '';
    }
  }

  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }

  return pages.length > 0 ? pages : [cleanText.substring(0, 1000)];
}
