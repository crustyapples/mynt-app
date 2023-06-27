import { useRouter } from "next/router";
import Event from "../../components/event";
import EventStats from "../../components/eventStats";
import { useEffect, useState } from "react";
import { Box, Skeleton, SkeletonText } from "@chakra-ui/react";
import QrReader from "react-qr-scanner";
// import { QrReader } from "react-qr-reader";
import axios from "axios";
import Table from "../../components/dataTable";
import ConfirmationModal from "../../components/confirmationModal";

const TELEGRAM_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT;
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const Content = () => {
  const router = useRouter();
  const [event, setEvent] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [table, setTable] = useState([]);

  function openScanner() {
    setScan(!scan);
  }

  const downloadCSV = () => {
    const csvRows = [];

    // Create the headers for the CSV file
    const headers = ["name", "handle", "contact", "status"];
    csvRows.push(headers.join(","));

    // Create a row for each user
    for (const user of users) {
      const values = headers.map((header) => user[header]);
      csvRows.push(values.join(","));
    }

    // Combine all rows into a single string
    const csvData = csvRows.join("\n");

    // Create a link to download the CSV file
    const link = document.createElement("a");
    link.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csvData)
    );
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);

    // Click the link to download the CSV file
    link.click();

    // Remove the link from the DOM
    document.body.removeChild(link);
  };

  const handleScan = (data) => {
    if (data) {
      const parsedData = JSON.parse(data.text);
      setParsedData(parsedData);
      const user = attendees.find(
        (user) => user.id === parsedData.userId && user.status === "SUCCESSFUL"
      );

      if (parsedData.eventTitle === event.title && user) {
        setShowModal(true);
      } else {
        alert("User is not registered for this event!");
        return;
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
  };

  async function getEvents() {
    const res = await fetch(BASE + "/viewEvents");
    const data = await res.json();
    return data;
  }

  async function getRegistrations(eventId) {
    const res = await fetch(BASE + `/getEventRegistrations/${eventId}`);
    const data = await res.json();
    return data;
  }

  async function getUserInfo(userId) {
    const res = await fetch(BASE + `/getUserInfo/${userId}`);
    const data = await res.json();
    return data;
  }

  useEffect(() => {
    getEvents().then((res) => {
      for (let i = 0; i < res.length; i++) {
        let eventData = {};
        if (res[i].id === router.query.id) {
          eventData = res[i];
          getRegistrations(res[i].title).then((res2) => {
            let userData = [];
            console.log(res2);
            const requests = res2.map((r) => getUserInfo(r.userId));
            Promise.all(requests).then((data) => {
              for (let i = 0; i < data.length; i++) {
                userData.push({
                  id: res2[i].userId,
                  status: res2[i].status,
                  mint_account: res2[i].mint_account,
                  registration_time: res2[i].registration_time,
                  redemption_time: res2[i].redemption_time,
                  ...data[i],
                });
              }

              console.log("event", eventData);
              console.log("users", userData);
              setLoading(false);
              setEvent(eventData);
              setUsers(userData);
              const tableData = userData.map((user) => {
                return {
                  id: user.id,
                  name: user.name,
                  handle: user.handle,
                  number: user.contact,
                  status: user.status,
                  mint_account: user.mint_account,
                  registration_time: user.registration_time,
                  redemption_time: user.redemption_time,
                };
              });
              setTable(tableData);
            });
          });
        }
      }
    });
  }, []);

  const attendees = users.filter(
    (user) => user.status.toLowerCase() === "successful"
  );

  const eventProps = {
    title: event.title,
    description: event.description,
    price: event.price,
    time: event.time,
    venue: event.venue,
    capacity: event.capacity,
    users: users,
    symbol: event.symbol,
    imageCID: event.imageCID,
  };

  const stats = {
    "Total Registered": users.length,
    "Total Redeemed":
      users.filter((user) => user.status === "REDEEMED").length +
      "/" +
      users.length,
    Revenue:
      "$" +
      users.filter((user) => user.status === "REDEEMED").length * event.price,
  };

  function handleCancel() {
    setShowModal(false);
  }

  const handleConfirm = () => {
    const text =
      "You have been successfully verified! Please enter the event venue :)";
    const chat_id = parsedData.chatId;
    console.log(chat_id);
    const telegramPush = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${chat_id}&text=${text}`;
    fetch(telegramPush).then((res) => {
      console.log(res);
    });
    const currentTime = new Date();
    const offset = 480; // offset in minutes for GMT+8
    const localTime = new Date(currentTime.getTime() + offset * 60 * 1000);
    const redemptionTime = localTime.toISOString();
    const user = attendees.find((user) => {
      return user.id === parsedData.userId && user.status === "SUCCESSFUL";
    });
    const data = {
      user_id: parsedData.userId,
      event_title: parsedData.eventTitle,
      status: "REDEEMED",
      mint_account: user.mint_account,
      redemption_time: redemptionTime,
    };

    // find user in table array with matching id and update status to REDEEMED

    const updatedTable = table.map((user) => {
      if (user.id === parsedData.userId) {
        user.status = "REDEEMED";
      }
      return user;
    });

    const updatedUsers = users.map((user) => {
      if (user.id === parsedData.userId) {
        user.status = "REDEEMED";
      }
      return user;
    });

    setUsers(updatedUsers);

    setTable(updatedTable);

    axios
      .post(BASE + "/updateRegistration", data)
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error);
      });

    setShowModal(false);
    // Show alert
    window.alert(`User: ${user.name} have been successfully verified!`);

    // Reload the page
    window.location.reload();
  };

  return (
    <div className="flex flex-col justify-center">
      {!loading && <Event {...eventProps} />}

      {!loading ? (
        <>
          <div className="flex flex-col justify-center">
            <div className="mb-2">
              <EventStats events={stats} />
            </div>

            <Table data={table} />
          </div>
          {scan ? (
            <>
              <h1 className="mt-4 font-bold text-3xl text-center">Scanner</h1>
              <div className="mx-auto my-5">
                <QrReader
                  scanDelay={200}
                  onError={handleError}
                  onScan={handleScan}
                  style={{
                    height: 240,
                    width: 320,
                  }}
                  facingMode="rear"
                  legacyMode={true}
                />
                {showModal && (
                  <ConfirmationModal
                    show={showModal}
                    title="Confirmation"
                    message={`This will redeem the ticket for the user. Are you sure you want to continue?`}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                  />
                )}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <Box margin="2" padding="4" boxShadow="lg" bg="white">
          <Skeleton height={64} />
          <SkeletonText mt="4" noOfLines={3} spacing="5" skeletonHeight="42" />
        </Box>
      )}
      <div className="my-10 flex justify-center">
        <button
          onClick={openScanner}
          className="flex flex-wrap w-1/6 items-center mx-1 text-white bg-green-500 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 text-center"
        >
          {scan ? "Close Scanner" : "Open Scanner"}
        </button>
        <button
          onClick={downloadCSV}
          className="flex flex-wrap w-1/6 items-center mx-1 text-white bg-yellow-500 hover:bg-yellow-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 text-center"
        >
          Download CSV
        </button>
      </div>
    </div>
  );
};

const Post = () => {
  return (
    <div>
      <Content />
    </div>
  );
};

export async function getServerSideProps() {
  return {
    props: {},
  };
}

export default Post;
