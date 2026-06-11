import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { niche } = await request.json();
    const targetNiche = niche || 'General';

    const apiKey = process.env.NVIDIA_API_KEY;
    let calendar = [];

    if (apiKey) {
      try {
        const prompt = `You are a professional social media planner.
Create a 7-day social media content plan for a user in the "${targetNiche}" niche.
For each day, provide:
1. Day index (1 to 7)
2. Theme (A short hook topic)
3. Caption (1-2 sentences of engaging post content copy)
4. Hashtags (2-3 relevant hashtags)

Response MUST be a single valid JSON object containing a "calendar" array:
{
  "calendar": [
    { "day": 1, "theme": "Day 1 Hook", "caption": "Day 1 Post Caption text", "hashtags": "#tag1 #tag2" },
    ...
  ]
}`;

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 800,
            response_format: { type: 'json_object' }
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const parsed = JSON.parse(resData?.choices?.[0]?.message?.content || '{}');
          if (Array.isArray(parsed.calendar)) {
            calendar = parsed.calendar;
          }
        }
      } catch (err) {
        console.error("LLM Calendar generation failed, falling back to templates:", err);
      }
    }

    // Heuristics Fallback if LLM fails or NVIDIA_API_KEY is not configured
    if (!calendar || calendar.length === 0) {
      const nicheLower = targetNiche.toLowerCase();

      if (nicheLower.includes('estate') || nicheLower.includes('property') || nicheLower.includes('home')) {
        calendar = [
          { day: 1, theme: "Virtual Property Tour", caption: "Take a walk through our latest luxury residential listings in Kalyan. Modern amenities at a budget price! 🏢", hashtags: "#KalyanProperties #DreamHome #ToleeRealEstate" },
          { day: 2, theme: "First-Time Buyer Checklist", caption: "Are you planning to buy your first home? Here are 5 things you need to double-check before paying booking amount! 📋", hashtags: "#HomeBuyingTips #FirstHome #SmartInvesting" },
          { day: 3, theme: "Local Infrastructure Updates", caption: "Huge news for property owners! The new metro connector projects are set to reduce commute times significantly. 🚆", hashtags: "#LocalNews #KalyanGrowth #PropertyValue" },
          { day: 4, theme: "Before vs After Renovation", caption: "Check out this jaw-dropping living room transformation we did for our client. What do you think of this color palette? 🎨", hashtags: "#InteriorDesign #HomeTransformation #Inspire" },
          { day: 5, theme: "Investment Niche Opportunities", caption: "Why commercial retail shops are yielding 2x higher rental returns compared to standard apartments this year. 💼", hashtags: "#CommercialRealEstate #PassiveIncome #PropertyWealth" },
          { day: 6, theme: "Weekly FAQ Q&A", caption: "Answering all your questions about home loans, builder reputations, and interest rates. Drop your queries below! 💬", hashtags: "#RealEstateFAQ #AskMeAnything #PropertyHelper" },
          { day: 7, theme: "Happy Client Spotlight", caption: "Congratulations to the Patil family for booking their dream flat with us! We wish you endless happiness in your new home. 🏡✨", hashtags: "#HappyClients #SuccessStory #ToleeFamily" }
        ];
      } else if (nicheLower.includes('food') || nicheLower.includes('restaurant') || nicheLower.includes('bakery') || nicheLower.includes('cafe')) {
        calendar = [
          { day: 1, theme: "Behind the Scenes Recipe", caption: "Watch how our chef prepares the signature butter garlic paneer. Fresh ingredients, direct to your table! 🍽️", hashtags: "#BehindTheScenes #FreshFood #FoodiesOfTolee" },
          { day: 2, theme: "Customer Review Spotlight", caption: "We are feeling incredibly grateful for this beautiful review from our local regulars. Serving you is our joy! ❤️", hashtags: "#HappyCustomers #LocalCafe #ToleeFood" },
          { day: 3, theme: "Special Combo Offers", caption: "Double the taste, half the price! Check out our new mid-week lunch special combos starting from just ₹149. 🍱", hashtags: "#FoodCombos #BudgetEats #LunchSpecial" },
          { day: 4, theme: "Chef's Secret Tip", caption: "How to keep your coriander leaves fresh for up to two weeks using this simple kitchen hack. 🌿", hashtags: "#KitchenHacks #ChefsTips #CookingSecrets" },
          { day: 5, theme: "Local Food Meetup", caption: "Hosting a local community food tasting meetup this Sunday evening. DM us to reserve a tasting slot! 🍕", hashtags: "#FoodTasting #LocalMeetup #ToleeEvents" },
          { day: 6, theme: "Weekend Special Menu", caption: "Introducing our wood-fired special pizzas only available on Fridays and Saturdays. Grab a slice before they sell out! 🍕🔥", hashtags: "#WeekendSpecial #WoodFiredPizza #TreatYourself" },
          { day: 7, theme: "Interactive Poll Time", caption: "Are you Team Paneer Tikka or Team Soya Chaap? Cast your votes in the comments below! 👇", hashtags: "#InteractivePoll #FoodWars #ToleeChitChat" }
        ];
      } else {
        // General / Skincare / Tech / Default
        calendar = [
          { day: 1, theme: "Introduce Yourself & Goals", caption: "Welcome to my Tolee profile! I'll be sharing updates, helpful tips, and direct insights about my journey here. Let's connect! 🤝", hashtags: "#ToleeCreator #NewBeginnings #Introductions" },
          { day: 2, theme: "A Day in the Life", caption: "A quick glimpse into my daily routine as a creator. Balance is key to consistent productivity! ⏳", hashtags: "#DayInTheLife #Productivity #CreatorMindset" },
          { day: 3, theme: "My Top 3 Free Tools", caption: "These 3 free digital platforms completely changed how I plan my content and organize my days. 🛠️", hashtags: "#FreeResources #ToolsOfTheTrade #SmartWork" },
          { day: 4, theme: "Busting Niche Myths", caption: "Addressing the biggest misconception people have about my profession. Read the truth below! 💡", hashtags: "#MythBusters #Insights #ToleeLearn" },
          { day: 5, theme: "Collaboration Announcement", caption: "Big updates! Partnering with local creators to bring you some amazing collaborative projects very soon. 🚀", hashtags: "#Collaborations #GrowthMindset #CreativePartners" },
          { day: 6, theme: "Q&A Session", caption: "Got questions about my content, techniques, or tips? Ask me anything in the comments and I will reply to each one! 💬", hashtags: "#AskMeAnything #QandA #CommunityConnect" },
          { day: 7, theme: "Weekly Progress Review", caption: "Reflecting on this week's goals and achievements. Remember, slow progress is still progress! 📈✨", hashtags: "#WeeklyReflection #GoalAchieved #Inspiration" }
        ];
      }
    }

    return NextResponse.json({ success: true, calendar });

  } catch (error: any) {
    console.error('API Error in POST /api/ai-manager/generate-calendar:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
