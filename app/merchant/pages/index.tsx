import Head from "next/head";
import Card from "@/components/card";
import { useEffect, useState } from "react";
import BasicStatistics from "@/components/basicStats";
import { Box, Skeleton, SkeletonText } from "@chakra-ui/react";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Home() {
  const [loading, setLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<any>({});
  const [users, setUsers] = useState<any>({});


  let cards: JSX.Element[] = [];

  function generateCards(events: string | any[]) {
    for (let i = 0; i < events.length; i++) {
      cards.push(
        <div key={i} className="m-2">
          <Card
            key={i}
            title={events[i].title}
            description={events[i].description}
            price={events[i].price}
            time={events[i].time}
            venue={events[i].venue}
            capacity={events[i].capacity}
          />
        </div>
      );
    }
    return cards;
  }

  const cardSection = (body: any) => {
    return <div className="flex flex-wrap justify-center m-4">{body}</div>;
  };

  let loadingCards: JSX.Element[] = [];
  const generateLoadingCards = (body: any) => {
    for (let i = 0; i < 4; i++) {
      loadingCards.push(
        <Box key={i} margin={4} padding="2" boxShadow="lg" bg="white" width={80}>
          <Skeleton height={48} />
          <SkeletonText mt="4" noOfLines={8} spacing="4" skeletonHeight="4" />
        </Box>
      );
    }
    return loadingCards;
  };

  // make an api call to /viewEvents to get all the events created by the merchant
  // then map the events to the card component

  async function getEvents() {
    const res = await fetch("http://localhost:3000" + "/viewEvents");
    const data = await res.json();
    return data;
  }
  async function getAllRegistrations() {
    const res = await fetch("http://localhost:3000" + `/getAllRegistrations`);
    const data = await res.json();
    return data;
  }

  useEffect(() => {
    Promise.all([getEvents(), getAllRegistrations()]).then(([eventsRes, usersRes]) => {
      console.log(eventsRes);
      console.log(usersRes);
      setEvents(eventsRes);
      setUsers(usersRes);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Head>
        <title>Merchant Dashboard</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {/* <BasicStatistics events={loading == false ? events.length : 0} /> */}
        <BasicStatistics events ={{
              "Total Events": events.length,
              "NFTs Minted": 
                users.filter((user: { status: string; }) => user.status === "SUCCESSFUL").length,
              "Revenue":
                "$" +
                users.filter((user: { status: string; }) => user.status === "SUCCESSFUL").length*10,
            }} />
        {loading == false ? (
          cardSection(generateCards(events))
        ) : ( cardSection(generateLoadingCards(loadingCards))
        )}
      </main>
    </>
  );
}
