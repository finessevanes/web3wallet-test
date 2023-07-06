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
import { getSdkError } from "@walletconnect/utils";

import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState, useCallback } from "react";

export default function App() {
  const [currentWCURI, setCurrentWCURI] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentProposal, setCurrentProposal] = useState();

  const [successfulSession, setSuccessfulSession] = useState(false);
  //Add Initialization
  useInitialization();

  async function pair() {
    const pairing = await web3WalletPair({ uri: currentWCURI });
    return pairing;
  }

  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments["session_proposal"]) => {
      setModalVisible(true);
      setCurrentProposal(proposal);
    },
    []
  );

  async function handleAccept() {
    const { id, params } = currentProposal;
    const { requiredNamespaces, relays } = params;

    if (currentProposal) {
      const namespaces: SessionTypes.Namespaces = {};
      Object.keys(requiredNamespaces).forEach((key) => {
        const accounts: string[] = [];
        requiredNamespaces[key].chains.map((chain) => {
          [currentETHAddress].map((acc) => accounts.push(`${chain}:${acc}`));
        });

        namespaces[key] = {
          accounts,
          methods: requiredNamespaces[key].methods,
          events: requiredNamespaces[key].events,
        };
      });

      await web3wallet.approveSession({
        id,
        relayProtocol: relays[0].protocol,
        namespaces,
      });

      setModalVisible(false);
      setCurrentWCURI("");
      setCurrentProposal(undefined);
      setSuccessfulSession(true);
    }
  }

  async function handleReject() {
    const { id } = currentProposal;

    if (currentProposal) {
      await web3wallet.rejectSession({
        id,
        reason: getSdkError("USER_REJECTED_METHODS"),
      });

      setModalVisible(false);
      setCurrentWCURI("");
      setCurrentProposal(undefined);
    }
  }

  // Add useEffect
  useEffect(() => {
    web3wallet?.on("session_proposal", onSessionProposal);
  }, [
    pair,
    handleAccept,
    handleReject,
    currentETHAddress,
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
        <View>
          <TextInput
            style={styles.textInputContainer}
            onChangeText={setCurrentWCURI}
            value={currentWCURI}
            placeholder="Enter WC URI (wc:1234...)"
          />
          <PairingModal
            handleAccept={handleAccept}
            handleReject={handleReject}
            visible={modalVisible}
            setModalVisible={setModalVisible}
            currentProposal={currentProposal}
          />
          <Button onPress={() => pair()} title="Pair Session" />
        </View>
      </View>
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
