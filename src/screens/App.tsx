import "fast-text-encoding";
import "@walletconnect/react-native-compat";
import { registerRootComponent } from "expo";
import useInitialization, {
  currentETHAddress,
  web3wallet,
  web3WalletPair,
} from "../utils/WalletConnectUtils";
import PairingModal from "./PairingModal";
import { SignClientTypes, SessionTypes } from "@walletconnect/types";
import { getSdkError, buildApprovedNamespaces } from "@walletconnect/utils";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { EIP155_SIGNING_METHODS } from "../utils/EIP155Lib";
import SignModal from "./SignModal";
import { BarCodeScanner } from "expo-barcode-scanner";

type SessionProposal = SignClientTypes.EventArguments["session_proposal"];
type SessionRequest = SignClientTypes.EventArguments["session_request"];

export default function App() {
  const [currentWCURI, setCurrentWCURI] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<SessionProposal>();
  const [successfulSession, setSuccessfulSession] = useState(false);
  const [requestSession, setRequestSession] = useState<SessionTypes.Struct>();
  const [requestEventData, setRequestEventData] = useState<SessionRequest>();
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);

  //Add Initialization
  useInitialization();

  // this the event is heard, session_proposal. this function gets called. the dapp initiatess the session proposal

  // this function sets the proposal to currentProposal
  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments["session_proposal"]) => {
      setModalVisible(true);
      setCurrentProposal(proposal);
    },
    []
  );

  // this function is responsible for accepting the proposal. the user clicks on this button to accept the proposal. the proposal information the user needs to accept would be the following:
  // what methods
  // what events
  // what chains
  // we need to get all of this our from the proposal

  async function handleAccept() {
    // the methods, chains, and events will need to be pulled out from the required and optional namespaces

    if (currentProposal) {
      const { id, params }: { id: number; params: any } = currentProposal;
      const { requiredNamespaces, optionalNamespaces } = params;
      const namespaces: SessionTypes.Namespaces = {};

      console.log("params REQ", params.requiredNamespaces);
      console.log("params OPT", params.optionalNamespaces);

      // here we will pull the chains and accounts from
      Object.keys(requiredNamespaces).forEach((key) => {
        // create an array for accounts and chains
        const accounts: string[] = [];
        // chains is new using the util
        const chains: string[] = [];

        // you go though chains
        requiredNamespaces[key].chains.map((chain: string) => {
          [currentETHAddress].map((acc) => accounts.push(`${chain}:${acc}`));
          chains.push(chain);
        });
        namespaces[key] = {
          chains,
          accounts,
          methods: requiredNamespaces[key].methods,
          events: requiredNamespaces[key].events,
        };
      });

      // here pull the chains and accounts from optional namespaces
      Object.keys(optionalNamespaces).forEach((key) => {
        const accounts: string[] = [];
        const chains: string[] = [];

        optionalNamespaces[key].chains.map((chain: string) => {
          [currentETHAddress].map((acc) => accounts.push(`${chain}:${acc}`));
          chains.push(chain);
        });
        namespaces[key] = {
          chains,
          accounts,
          methods: optionalNamespaces[key].methods,
          events: optionalNamespaces[key].events,
        };
      });

      console.log("#### buildApprovedNameSpace data:", namespaces);

      // const buildApprovedNameSpace = {
      //   eip155: {
      //     accounts: [
      //       "eip155:1:0xaf91278622287E909adD0A163E67a7614Cd1C578",
      //       "eip155:10:0xaf91278622287E909adD0A163E67a7614Cd1C578",
      //     ],
      //     chains: ["eip155:1", "eip155:10"],
      //     events: [],
      //     methods: [
      //       "eth_signTransaction",
      //       "eth_sign",
      //       "eth_signTypedData",
      //       "eth_signTypedData_v4",
      //     ],
      //   },
      // };

      console.log("params...", params.requiredNamespaces);
      console.log("namespaces 1...", namespaces.eip155.chains);
      console.log("namespaces 2...", namespaces.eip155.methods);
      console.log("namespaces 3...", namespaces.eip155.events);
      console.log("namespaces 4...", namespaces.eip155.accounts);

      const approvedNamespaces = buildApprovedNamespaces({
        proposal: params,
        supportedNamespaces: {
          eip155: {
            chains: namespaces.eip155.chains,
            methods: ["eth_sendTransaction", "personal_sign"],
            events: ["chainChanged", "accountsChanged"],
            accounts: namespaces.eip155.accounts,
          },
        },
      });

      console.log("approvedNamespaces...", approvedNamespaces);

      await web3wallet.approveSession({
        id,
        namespaces: approvedNamespaces,
      });

      setModalVisible(false);
      setCurrentWCURI("");
      setCurrentProposal(undefined);
      setSuccessfulSession(true);
    }
  }

  async function disconnect() {
    const activeSessions = await web3wallet.getActiveSessions();
    const topic = Object.values(activeSessions)[0].topic;

    if (activeSessions) {
      await web3wallet.disconnectSession({
        topic,
        reason: getSdkError("USER_DISCONNECTED"),
      });
    }
    setSuccessfulSession(false);
  }

  async function handleReject() {
    if (currentProposal) {
      const { id }: { id: number } = currentProposal;
      await web3wallet.rejectSession({
        id,
        reason: getSdkError("USER_REJECTED_METHODS"),
      });

      setModalVisible(false);
      setCurrentWCURI("");
      setCurrentProposal(undefined);
    }
  }

  const onSessionRequest = useCallback(
    async (requestEvent: SignClientTypes.EventArguments["session_request"]) => {
      const { topic, params } = requestEvent;
      const { request } = params;
      const requestSessionData =
        web3wallet.engine.signClient.session.get(topic);

      switch (request.method) {
        case EIP155_SIGNING_METHODS.ETH_SIGN:
        case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          setRequestSession(requestSessionData);
          setRequestEventData(requestEvent);
          setSignModalVisible(true);
          return;
      }
    },
    []
  );

  const handleBarCodeScanned = async ({ data: uri }: { data: string }) => {
    setScanning(false);
    // Optionally, you can validate 'uri' here.
    setCurrentWCURI(uri);
    try {
      await pair({ uri });
    } catch (error) {
      console.error("Failed to pair:", error);
    }
  };

  async function pair({ uri }: { uri: string }) {
    const pairing = await web3WalletPair({ uri });
    return pairing;
  }

  // Add useEffect
  useEffect(() => {
    web3wallet?.on("session_proposal", onSessionProposal);
    web3wallet?.on("session_request", onSessionRequest);
  }, [
    pair,
    handleAccept,
    handleReject,
    currentETHAddress,
    onSessionRequest,
    onSessionProposal,
    successfulSession,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        <Text>Web3Wallet Tutorial</Text>
        <Text style={styles.addressContent}>
          ETH Address: {currentETHAddress ? currentETHAddress : "Loading..."}
        </Text>

        {!successfulSession ? (
          <View>
            <TextInput
              style={styles.textInputContainer}
              onChangeText={setCurrentWCURI}
              value={currentWCURI}
              placeholder="Enter WC URI (wc:1234...)"
            />
            <View>
              {scanning ? (
                <BarCodeScanner
                  onBarCodeScanned={handleBarCodeScanned}
                  style={{ height: 200, width: 200 }}
                />
              ) : (
                <Button
                  title="Scan QR Code"
                  onPress={() => setScanning(true)}
                />
              )}
            </View>
            {!scanning && (
              <Button
                onPress={() => pair({ uri: currentWCURI })}
                title="Pair Session"
              />
            )}
          </View>
        ) : (
          <Button onPress={() => disconnect()} title="Disconnect" />
        )}
      </View>

      <PairingModal
        handleAccept={handleAccept}
        handleReject={handleReject}
        visible={modalVisible}
        setModalVisible={setModalVisible}
        currentProposal={currentProposal}
      />

      <SignModal
        visible={signModalVisible}
        setModalVisible={setSignModalVisible}
        requestEvent={requestEventData}
        requestSession={requestSession}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContentContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 34,
    borderWidth: 1,
    width: "100%",
    height: "40%",
    position: "absolute",
    bottom: 0,
  },
  textInputContainer: {
    height: 40,
    width: 250,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 10,
    padding: 4,
  },
  addressContent: {
    textAlign: "center",
    marginVertical: 8,
  },
});

registerRootComponent(App);
