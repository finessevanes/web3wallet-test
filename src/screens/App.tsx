import "fast-text-encoding";
import "@walletconnect/react-native-compat";
import { registerRootComponent } from "expo";
import { StyleSheet, View } from "react-native";

export default function App() {
  // useInitialization

  // onSessionProposal

  // onSessionDelete

  // handleAccept

  // disconnect

  // handleReject

  // onSessionRequest

  // handleBarCodeScanned

  // pair

  // useEffect web3wallet.on x 3

  return <View style={styles.container}>
    // TODO
    </View>;
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
  scannerStyle: {
    height: 200,
    width: 200,
    borderRadius: 20,
    overflow: "hidden",
  },
  cameraContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
});

registerRootComponent(App);
