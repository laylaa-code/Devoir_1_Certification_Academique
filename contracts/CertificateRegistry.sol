// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {
    address public owner;
    uint256 public nextCertificateId = 1;

    struct Certificate {
        string studentName;
        string studentId;
        string diplomaTitle;
        string issueDate;
        string grade;
        address recipient;
        bool revoked;
    }

    mapping(uint256 => Certificate) private certificates;
    mapping(bytes32 => bool) private usedStudentIds;

    event CertificateMinted(
        uint256 indexed certId,
        string studentId,
        address indexed recipient
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Compte non autorise");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mintCertificate(
        address to,
        string calldata studentName,
        string calldata studentId,
        string calldata diplomaTitle,
        string calldata issueDate,
        string calldata grade
    ) external onlyOwner returns (uint256 certId) {
        return _mint(to, studentName, studentId, diplomaTitle, issueDate, grade);
    }

    function batchMint(
        address[] calldata recipients,
        string[] calldata studentNames,
        string[] calldata studentIds,
        string[] calldata diplomaTitles,
        string[] calldata issueDates,
        string[] calldata grades
    ) external onlyOwner {
        uint256 n = studentIds.length;
        require(n > 0, "Liste vide");
        require(
            recipients.length == n &&
            studentNames.length == n &&
            diplomaTitles.length == n &&
            issueDates.length == n &&
            grades.length == n,
            "Tailles de listes differentes"
        );

        for (uint256 i = 0; i < n; i++) {
            _mint(
                recipients[i],
                studentNames[i],
                studentIds[i],
                diplomaTitles[i],
                issueDates[i],
                grades[i]
            );
        }
    }

    function getCertificate(uint256 certId)
        external
        view
        returns (Certificate memory)
    {
        require(certId > 0 && certId < nextCertificateId, "Certificat introuvable");
        return certificates[certId];
    }

    function _mint(
        address to,
        string memory studentName,
        string memory studentId,
        string memory diplomaTitle,
        string memory issueDate,
        string memory grade
    ) private returns (uint256 certId) {
        require(bytes(studentName).length > 0, "Nom obligatoire");
        require(bytes(studentId).length > 0, "CNE obligatoire");
        require(bytes(diplomaTitle).length > 0, "Diplome obligatoire");
        require(bytes(issueDate).length > 0, "Date obligatoire");
        require(bytes(grade).length > 0, "Mention obligatoire");

        bytes32 studentKey = keccak256(bytes(studentId));
        require(!usedStudentIds[studentKey], "CNE deja enregistre");
        usedStudentIds[studentKey] = true;

        certId = nextCertificateId;
        nextCertificateId++;

        certificates[certId] = Certificate({
            studentName: studentName,
            studentId: studentId,
            diplomaTitle: diplomaTitle,
            issueDate: issueDate,
            grade: grade,
            recipient: to,
            revoked: false
        });

        emit CertificateMinted(certId, studentId, to);
    }
}
