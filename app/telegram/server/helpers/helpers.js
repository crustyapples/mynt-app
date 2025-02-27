const {
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} = require("@solana/spl-token");
const {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
  Transaction,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
  TransactionMessage,
  VersionedTransaction,
} = require("@solana/web3.js");
const { AnchorProvider, Program } = require("@project-serum/anchor");
const firebase = require("firebase/app");
const { initializeApp } = require("firebase/app");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  getFirestore,
  addDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
} = require("firebase/firestore");
const {
  default: NodeWallet,
} = require("@project-serum/anchor/dist/cjs/nodewallet");
require("dotenv").config({ path: "./.env" });

const idl = require("../idl.json");
const firebaseConfigDev = {
  apiKey: process.env.FIREBASE_DEV_API_KEY,
  authDomain: "treehoppers-mynt.firebaseapp.com",
  projectId: "treehoppers-mynt",
  storageBucket: "treehoppers-mynt.appspot.com",
  messagingSenderId: "751257459683",
  appId: "1:751257459683:web:10c7f44cd9684098205ed6",
};
const firebaseConfigProd = {
  apiKey: process.env.FIREBASE_PROD_API_KEY,
  authDomain: "treehoppers-mynt-prod.firebaseapp.com",
  projectId: "treehoppers-mynt-prod",
  storageBucket: "treehoppers-mynt-prod.appspot.com",
  messagingSenderId: "896296035834",
  appId: "1:896296035834:web:d930407a247bbae63d7043",
  measurementId: "G-25SHHFJM1K"
};
let firebaseConfig;
if (process.env.NODE_ENV === 'development') {
  firebaseConfig = firebaseConfigDev
  console.log("Connected to development DB")
} else if (process.env.NODE_ENV === 'production') {
  firebaseConfig = firebaseConfigProd
  console.log("Connected to production DB")
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
// const CUSTOM_DEVNET_RPC = process.env.DEVNET_RPC;
// Firebase Methods
module.exports = {
  getWalletBalanceFirebase: async (userId) => {
    const docRef = doc(db, "users", userId.toString());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { balance } = docSnap.data();
      return { balance };
    } else {
      return { balance: 0 };
    }
  },

  getTransactionHistoryFirebase: async (userId) => {
    const transactionRef = collection(db, "transactions");
    // UserId needs to be converted from number to string prior to the check
    const filter = query(
      transactionRef,
      where("userId", "==", userId.toString())
    );
    const querySnapshot = await getDocs(filter);
    const transactions = [];
    querySnapshot.forEach((doc) => {
      const transactionData = doc.data();
      transactions.push(transactionData);
    });
    return transactions;
  },

  getUserFirebase: async (userId) => {
    const docRef = doc(db, "users", userId.toString());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return { name: "No Such User Exists" };
    }
  },

  insertUserFirebase: async (userInfo) => {
    docData = {
      handle: userInfo.user_handle,
      name: userInfo.user_name,
      contact: userInfo.user_contact,
      balance: 0,
      chat_id: userInfo.chat_id,
    };
    // Doc ID needs to be a string
    await setDoc(doc(db, "users", userInfo.user_id.toString()), docData);
  },

  updateUserBalanceFirebase: async (userBalanceInfo) => {
    const userId = userBalanceInfo.user_id;
    const docRef = doc(db, "users", userId.toString());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentBalance = docSnap.data().balance;
      if (userBalanceInfo.transaction_type == "TOP_UP") {
        const newBalance = currentBalance + userBalanceInfo.amount;
        await updateDoc(docRef, { balance: newBalance });
        console.log(
          `User ${userId} topped up ${userBalanceInfo.amount} successfully`
        );
      }
      if (userBalanceInfo.transaction_type == "SALE") {
        const newBalance = currentBalance - userBalanceInfo.amount;
        await updateDoc(docRef, { balance: newBalance });
        console.log(
          `${userBalanceInfo.amount} deducted from user ${userId} balance`
        );
      }
      if (userBalanceInfo.transaction_type == "REFUND") {
        const newBalance = currentBalance + userBalanceInfo.amount;
        await updateDoc(docRef, { balance: newBalance });
        console.log(
          `User ${userId} refunded ${userBalanceInfo.amount} successfully`
        );
      }
    } else {
      return { error: "User does not exist" };
    }
  },

  insertTransactionFirebase: async (transactionInfo) => {
    docData = {
      userId: transactionInfo.user_id.toString(),
      transactionType: transactionInfo.transaction_type,
      amount: transactionInfo.amount,
      timestamp: transactionInfo.timestamp,
    };
    if ("event_title" in transactionInfo) {
      docData.eventTitle = transactionInfo.event_title;
    }
    const docId = docData.userId + " " + docData.timestamp;
    await setDoc(doc(db, "transactions", docId), docData);
    console.log(`Transaction ${docId} inserted successfully`);
  },

  updateBankBalanceFirebase: async (bankBalanceInfo) => {
    const docRef = doc(db, "bank", "MYNT_BANK");
    const docSnap = await getDoc(docRef);
    if (bankBalanceInfo.transaction_type == "TOP_UP") {
      const currentDeposits = docSnap.data().totalDeposits;
      const updatedDeposits = currentDeposits + bankBalanceInfo.amount;
      await updateDoc(docRef, { totalDeposits: updatedDeposits });
      console.log(`Bank Total Deposits updated to be ${updatedDeposits}`);
    }
    if (bankBalanceInfo.transaction_type == "SALE") {
      const currentSales = docSnap.data().totalSales;
      const updatedSales = currentSales + bankBalanceInfo.amount;
      await updateDoc(docRef, { totalSales: updatedSales });
      console.log(`Bank Total Sales updated to be ${updatedSales}`);
    }
    if (bankBalanceInfo.transaction_type == "REFUND") {
      const currentSales = docSnap.data().totalSales;
      const updatedSales = currentSales - bankBalanceInfo.amount;

      await updateDoc(docRef, {
        totalSales: updatedSales,
      });

      console.log(`Bank Total Sales updated to be ${updatedSales}`);
    }
  },

  getEventRegistrationsFirebase: async (eventTitle) => {
    const querySnapshot = await getDocs(collection(db, "registrations"));
    const registrationInfos = [];
    querySnapshot.forEach((doc) => {
      if (doc.data().eventTitle === eventTitle) {
        registrationInfos.push(doc.data());
      }
    });
    return registrationInfos;
  },

  getEventsFirebase: async () => {
    const querySnapshot = await getDocs(collection(db, "events"));
    const eventInfos = [];
    querySnapshot.forEach((doc) => {
      // const eventTitle = doc.id
      const eventData = { id: doc.id, ...doc.data() };
      // eventData.title = eventTitle
      eventInfos.push(eventData);
    });
    return eventInfos;
  },

  getRegistrationsFirebase: async (userId) => {
    const registrationRef = collection(db, "registrations");
    // UserId needs to be converted from number to string prior to the check
    const filter = query(
      registrationRef,
      where("userId", "==", userId.toString())
    );
    const querySnapshot = await getDocs(filter);
    const registrationInfos = [];
    querySnapshot.forEach((doc) => {
      const registrationData = doc.data();
      registrationInfos.push(registrationData);
    });
    return registrationInfos;
  },

  getAllRegistrationsFirebase: async () => {
    const registrationRef = collection(db, "registrations");
    // UserId needs to be converted from number to string prior to the check
    const filter = query(registrationRef);
    const querySnapshot = await getDocs(filter);
    const registrationInfos = [];
    querySnapshot.forEach((doc) => {
      const registrationData = doc.data();
      registrationInfos.push(registrationData);
    });
    return registrationInfos;
  },

  insertRegistrationFirebase: async (registrationInfo) => {
    docData = {
      // Inserting as a string bc user_id in user collection is string as well
      userId: registrationInfo.user_id.toString(),
      eventTitle: registrationInfo.event_title,
      status: registrationInfo.status,
      registration_time: registrationInfo.registration_time,
    };
    // Doc ID needs to be a string
    const docId = docData.userId + docData.eventTitle;
    await setDoc(doc(db, "registrations", docId.toString()), docData);
  },

  updateRegistrationFirebase: async (registrationInfo) => {
    docData = {
      userId: registrationInfo.user_id.toString(),
      eventTitle: registrationInfo.event_title,
      status: registrationInfo.status,
      mint_account: registrationInfo.mint_account,
    };

    // Include redemption_time only if it exists
    if (registrationInfo.redemption_time) {
      docData.redemption_time = registrationInfo.redemption_time;
    }

    if (registrationInfo.mint_account) {
      docData.mint_account = registrationInfo.mint_account;
    }

    const docId = docData.userId + docData.eventTitle;
    const docRef = doc(db, "registrations", docId.toString());

    // Include redemption_time only if it exists
    const updateData = {
      status: docData.status,
    };
    if (docData.redemption_time) {
      updateData.redemption_time = docData.redemption_time;
    }
    if (docData.mint_account) {
      updateData.mint_account = docData.mint_account;
    }

    await updateDoc(docRef, updateData);
  },

  getNftInfoFirebase: async (eventTitle) => {
    try {
      const nftRef = collection(db, "nfts");
      const filter = query(nftRef, where("title", "==", eventTitle));
      const querySnapshot = await getDocs(filter);
      const nftInfo = [];
      querySnapshot.forEach((doc) => {
        const nftDetails = doc.data();
        nftInfo.push(nftDetails);
      });
      return nftInfo;
    } catch (err) {
      console.log("getNftInfoFirebase error ", err);
    }
  },

  getUserWalletFirebase: async (userId) => {
    const createUserWalletFirebase = async (userId) => {
      console.log("New user detected, creating new wallet for ", userId);

      // Generate a new key pair for the Solana network
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey;
      const privateKey = keypair.secretKey;

      // Save public & private key in user's record
      const userRef = doc(db, "users", userId.toString());
      await updateDoc(userRef, {
        publicKey: publicKey.toString(),
        privateKey: Array.from(privateKey),
      });
      return { publicKey, privateKey, newWallet: true };
    };
    try {
      const docRef = doc(db, "users", userId.toString());
      const docSnap = await getDoc(docRef);
      const userInfo = docSnap.data();
      if ("publicKey" in userInfo && "privateKey" in userInfo) {
        const rawPrivateKey = userInfo.privateKey;
        const privateKeyArray = Uint8Array.from(
          Object.entries(rawPrivateKey).map(([key, value]) => value)
        );
        const userKeyPair = Keypair.fromSecretKey(privateKeyArray);
        const publicKey = userKeyPair.publicKey;
        const privateKey = userKeyPair.secretKey;
        console.log(`Retrieving wallet for ${userId}`);
        return { publicKey, privateKey, newWallet: false };
      } else {
        const walletKeys = await createUserWalletFirebase(userId);
        return walletKeys;
      }
    } catch (err) {
      console.log("getUserWalletFirebase error ", err);
    }
  },

  getMasterWalletFirebase: async () => {
    try {
      const docRef = doc(db, "keypair", "master");
      const docSnap = await getDoc(docRef);
      const keypairData = docSnap.data();
      return keypairData;
    } catch (err) {
      console.log("getMasterKeypairFirebase error, ", err);
    }
  },

  mintNft: async (
    userKeypair, 
    creatorKey, 
    title, 
    symbol, 
    uri,
    TOKEN_METADATA_PROGRAM_ID,
    provider,
    program
  ) => {
    try {
      const mintAccount = Keypair.generate();
      let nftTokenAccount;
      let metadataAccount;
      let masterEditionAccount;

      const getMetadataAccount = async (mintAccount) => {
        return (
          await PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mintAccount.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
          )
        )[0];
      };

      const getMasterEditionAccount = async (mintAccount) => {
        return (
          await PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mintAccount.toBuffer(),
              Buffer.from("edition"),
            ],
            TOKEN_METADATA_PROGRAM_ID
          )
        )[0];
      };

      const createAndInitializeAccounts = async () => {
        // Create & Initialize Mint Account
        const rentLamports = await getMinimumBalanceForRentExemptMint(
          program.provider.connection
        );
        const createMintInstruction = SystemProgram.createAccount({
          fromPubkey: userKeypair.publicKey,
          newAccountPubkey: mintAccount.publicKey,
          lamports: rentLamports,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        });
        const initializeMintInstruction = createInitializeMintInstruction(
          mintAccount.publicKey,
          0,
          userKeypair.publicKey,
          userKeypair.publicKey
        );
        // Get address of (Associated) Token Account
        nftTokenAccount = await getAssociatedTokenAddress(
          mintAccount.publicKey,
          userKeypair.publicKey
        );
        const createAtaInstruction = createAssociatedTokenAccountInstruction(
          userKeypair.publicKey,
          nftTokenAccount,
          userKeypair.publicKey,
          mintAccount.publicKey
        );
        const transactions = new Transaction().add(
          createMintInstruction,
          initializeMintInstruction,
          createAtaInstruction
        );
        const response = await provider.sendAndConfirm(
          transactions,
          [mintAccount, userKeypair],
          { commitment: "processed" }
        );
      };

      const sendMintTransaction = async () => {
        metadataAccount = await getMetadataAccount(mintAccount.publicKey);
        masterEditionAccount = await getMasterEditionAccount(
          mintAccount.publicKey
        );
        const mintTransaction = await program.methods
          .mintNft(creatorKey, uri, title, symbol)
          .accounts({
            mintAuthority: userKeypair.publicKey,
            mintAccount: mintAccount.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            metadataAccount: metadataAccount,
            tokenAccount: nftTokenAccount,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            payer: userKeypair.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            masterEdition: masterEditionAccount,
          })
          .signers([userKeypair])
          .rpc({ skipPreflight: true, commitment: "processed" });
        console.log(
          "Successfully Minted NFT to wallet, txn: ",
          mintTransaction
        );
        return mintTransaction;
      };

      await createAndInitializeAccounts();
      await sendMintTransaction();
      return {
        mintAccountAddress: mintAccount.publicKey.toString(),
      };
    } catch (err) {
      console.log("mintNft error ", err);
      return { mintAccountAddress: "Minting failed" };
    }
  },

  transferSol: async (userId, masterKeypair, userPublickey, connection) => {
    try {
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: masterKeypair.publicKey,
        lamports: 0.05 * LAMPORTS_PER_SOL,
        toPubkey: userPublickey,
      });
      const transaction = new Transaction().add(transferInstruction);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [masterKeypair],
        { skipPreflight: true, commitment: "processed" }
      );
      console.log("Successfully transferred SOL to User, ", userId);
    } catch (err) {
      console.log("Error while transferring SOL", err);
    }
  },

  transferNft: async (
    userId, 
    masterKeypair,
    userPublickey,
    connection,
    mintAccountAddress
  ) => {
    try {
      const mintAccount = new PublicKey(mintAccountAddress);
      const masterAssociatedTokenAccount = await getAssociatedTokenAddress(
        mintAccount,
        masterKeypair.publicKey
      );
      const userAssociatedTokenAccount = await getAssociatedTokenAddress(
        mintAccount,
        userPublickey
      );

      const createAtaInstruction = createAssociatedTokenAccountInstruction(
        masterKeypair.publicKey,
        userAssociatedTokenAccount,
        userPublickey,
        mintAccount
      );
      const transferInstruction = createTransferInstruction(
        masterAssociatedTokenAccount,
        userAssociatedTokenAccount,
        masterKeypair.publicKey,
        1,
        []
      );
      const instructions = [createAtaInstruction, transferInstruction];

      const blockhash = await connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);

      const messageV0 = new TransactionMessage({
        payerKey: masterKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([masterKeypair]);

      const txid = await connection.sendTransaction(transaction, { skipPreflight: true, commitment: "processed" });
      console.log("Successfully Transferred NFT to user ", userId);
      return mintAccountAddress;
    } catch (err) {
      console.log("transferNft failed, ", err);
      return "Minting failed";
    }
  },
};
