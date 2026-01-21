// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// TNS Payment Forwarder - Send TRUST to .trust domains
// DEPLOY ORDER: 7 of 7
// Constructor Parameters:
//   _tns: TNSRegistry address
//   _resolver: TNSResolver address
//   _baseNode: Use HashHelper.getBaseNode()
//
// IMPORTANT: Select "TNSPaymentForwarder" from the dropdown
// ============================================

// ========== ABSTRACT CONTRACTS ==========

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() { _status = _NOT_ENTERED; }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// ========== INTERFACES ==========

interface ITNS {
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
}

interface ITNSResolver {
    function addr(bytes32 node) external view returns (address);
}

// ========== TNSPaymentForwarder ==========

/**
 * @dev Enables sending native TRUST tokens to .trust domain names.
 *      Resolves the domain to an address and forwards the payment.
 */
contract TNSPaymentForwarder is ReentrancyGuard {
    ITNS public immutable tns;
    ITNSResolver public resolver;
    bytes32 public immutable baseNode;
    address public owner;

    event PaymentForwarded(
        string indexed domainName,
        bytes32 indexed node,
        address indexed from,
        address to,
        uint256 amount
    );

    event ResolverUpdated(address oldResolver, address newResolver);

    constructor(
        ITNS _tns,
        ITNSResolver _resolver,
        bytes32 _baseNode
    ) {
        tns = _tns;
        resolver = _resolver;
        baseNode = _baseNode;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev Sends TRUST tokens to a .trust domain name.
     * @param domainName The domain name (without .trust suffix).
     */
    function sendPayment(string calldata domainName) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        require(bytes(domainName).length > 0, "Domain name required");

        // Calculate the node hash for the domain
        bytes32 labelHash = keccak256(bytes(domainName));
        bytes32 node = keccak256(abi.encodePacked(baseNode, labelHash));

        // Get the resolver for this node (could be domain-specific or default)
        address domainResolver = tns.resolver(node);
        if (domainResolver == address(0)) {
            domainResolver = address(resolver);
        }

        // Resolve the address
        address recipient = ITNSResolver(domainResolver).addr(node);
        require(recipient != address(0), "Domain has no address set");

        // Forward the payment
        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "Payment transfer failed");

        emit PaymentForwarded(domainName, node, msg.sender, recipient, msg.value);
    }

    /**
     * @dev Sends TRUST tokens to a fully qualified .trust domain.
     * @param fullDomain The full domain name (e.g., "example.trust").
     */
    function sendPaymentToFullDomain(string calldata fullDomain) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        require(bytes(fullDomain).length > 6, "Invalid domain"); // minimum: x.trust

        // Extract the label (remove .trust suffix)
        bytes memory domainBytes = bytes(fullDomain);
        uint256 len = domainBytes.length;
        
        // Verify .trust suffix
        require(
            domainBytes[len-6] == '.' &&
            domainBytes[len-5] == 't' &&
            domainBytes[len-4] == 'r' &&
            domainBytes[len-3] == 'u' &&
            domainBytes[len-2] == 's' &&
            domainBytes[len-1] == 't',
            "Must end with .trust"
        );

        // Extract label
        bytes memory labelBytes = new bytes(len - 6);
        for (uint256 i = 0; i < len - 6; i++) {
            labelBytes[i] = domainBytes[i];
        }
        string memory label = string(labelBytes);

        // Calculate node and resolve
        bytes32 labelHash = keccak256(labelBytes);
        bytes32 node = keccak256(abi.encodePacked(baseNode, labelHash));

        address domainResolver = tns.resolver(node);
        if (domainResolver == address(0)) {
            domainResolver = address(resolver);
        }

        address recipient = ITNSResolver(domainResolver).addr(node);
        require(recipient != address(0), "Domain has no address set");

        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "Payment transfer failed");

        emit PaymentForwarded(label, node, msg.sender, recipient, msg.value);
    }

    /**
     * @dev Resolves a domain name to its address without sending payment.
     * @param domainName The domain name (without .trust suffix).
     * @return The resolved address.
     */
    function resolveAddress(string calldata domainName) external view returns (address) {
        bytes32 labelHash = keccak256(bytes(domainName));
        bytes32 node = keccak256(abi.encodePacked(baseNode, labelHash));
        
        address domainResolver = tns.resolver(node);
        if (domainResolver == address(0)) {
            domainResolver = address(resolver);
        }
        
        return ITNSResolver(domainResolver).addr(node);
    }

    /**
     * @dev Updates the default resolver address.
     * @param _resolver The new resolver address.
     */
    function setResolver(ITNSResolver _resolver) external onlyOwner {
        address oldResolver = address(resolver);
        resolver = _resolver;
        emit ResolverUpdated(oldResolver, address(_resolver));
    }

    /**
     * @dev Transfers ownership of this contract.
     * @param newOwner The new owner address.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @dev Allows the contract to receive TRUST tokens directly.
     */
    receive() external payable {}

    /**
     * @dev Withdraws any stuck funds (emergency function).
     */
    function withdraw() external onlyOwner {
        (bool sent, ) = owner.call{value: address(this).balance}("");
        require(sent, "Withdrawal failed");
    }
}
